/**
 * Vite plugin for `@mikata/kit`.
 *
 * Responsibilities:
 *   1. Register a virtual module, `virtual:mikata-routes`, whose source
 *      is generated from `src/routes/**`.
 *   2. Invalidate that module whenever a route file is added, removed,
 *      or renamed so the dev server picks up new routes without restart.
 *   3. (Future) Install dev-mode SSR middleware — stubbed here for the
 *      follow-up slice; the hook is already wired so enabling it is
 *      a small change.
 *
 * The plugin is framework-agnostic in the sense that the virtual module
 * emits plain dynamic imports — the app decides what to do with them
 * (typically: hand them to `createRouter` from `@mikata/router`).
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { scanRoutes, isApiRouteSource, type RouteManifest } from './scan-routes';
import { generateManifestModule } from './generate-manifest';
import { createSsrMiddleware } from './middleware';
import { prerender, type PrerenderOptions } from './prerender';

export interface MikataKitOptions {
  /**
   * Directory (relative to project root) that contains route files.
   * Default: `src/routes`.
   */
  routesDir?: string;
  /**
   * Extensions the scanner picks up. Default: `['.tsx', '.jsx', '.ts', '.js']`.
   */
  extensions?: readonly string[];
  /**
   * Dev-mode SSR middleware. Pass `false` to disable (pure-SPA dev).
   * Pass an object to override the server-entry path or outlet marker.
   * Default: enabled with entry `src/entry-server`.
   */
  ssr?: false | {
    /** Path (without extension) to the server entry, relative to project root. */
    entry?: string;
    /** HTML comment replaced with the rendered tree. Default: `<!--ssr-outlet-->`. */
    outletMarker?: string;
  };
  /**
   * Static-site generation. Runs after the SSR build completes (hooked
   * into `closeBundle` of the SSR invocation) and writes a ready-to-deploy
   * site to `outDir`. Pass `true` to enable with defaults, an object to
   * override, or `false` / omit to disable.
   *
   * The plugin only acts on SSR builds — `vite build --ssr ...` — so the
   * standard two-invocation flow (client build, then server build) works
   * unchanged.
   */
  prerender?: boolean | {
    /** Output directory for the static site. Default: `dist/static`. */
    outDir?: string;
    /** Client-build directory to copy assets from. Default: `dist/client`. */
    clientDir?: string;
    /** Extra concrete URLs to render on top of auto-discovered ones. */
    paths?: readonly string[];
    /**
     * Origin used when constructing per-page Fetch requests. Default:
     * `http://localhost`. Only the origin is used — pathname + search
     * come from the discovered URL.
     */
    baseUrl?: string;
    /** Emit a `404.html`. Default: `true`. */
    notFoundHtml?: boolean;
    /**
     * Behaviour when a parametric route has no `getStaticPaths` export
     * and no entry in `paths` matches its pattern. `'error'` (default)
     * fails the build; `'skip'` logs a warning and continues.
     */
    fallback?: 'error' | 'skip';
  };
}

const VIRTUAL_ID = 'virtual:mikata-routes';
// Vite convention: resolved id must start with a `\0` so other plugins
// know not to try and read it from disk.
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;

const DEFAULT_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js', '.mdx'] as const;

// Every `@mikata/*` package, kept manually so the exclude list is
// explicit and doesn't quietly expand to packages the user added
// under an unrelated scope. Used to seed Vite's `optimizeDeps.exclude`
// below — see the `config()` hook for the full rationale.
const MIKATA_PACKAGES = [
  '@mikata/compiler',
  '@mikata/form',
  '@mikata/i18n',
  '@mikata/icons',
  '@mikata/kit',
  '@mikata/persist',
  '@mikata/reactivity',
  '@mikata/router',
  '@mikata/runtime',
  '@mikata/server',
  '@mikata/store',
  '@mikata/testing',
  '@mikata/ui',
];

export default function mikataKit(options: MikataKitOptions = {}): Plugin {
  const routesDirRel = options.routesDir ?? 'src/routes';
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const ssrOptions = options.ssr === false ? null : (options.ssr ?? {});
  const prerenderOptions = normalizePrerenderOptions(options.prerender);
  const ssrEntryRel =
    (ssrOptions && ssrOptions.entry) ?? 'src/entry-server';

  let server: ViteDevServer | undefined;
  let projectRoot = '';
  let routesDirAbs = '';
  let resolvedConfig: ResolvedConfig | undefined;

  async function readManifest(): Promise<RouteManifest> {
    const files: string[] = [];
    await walk(routesDirAbs, routesDirAbs, files, extensions);
    // Classify API routes by reading each file and checking the
    // "no-default-export + at least one HTTP verb export" heuristic.
    // Done here (not in scanRoutes) so the scanner stays a pure
    // function of its filename inputs.
    const apiFiles = new Set<string>();
    await Promise.all(
      files.map(async (rel) => {
        const abs = path.join(routesDirAbs, rel);
        try {
          const source = await fs.readFile(abs, 'utf8');
          if (isApiRouteSource(source)) apiFiles.add(rel);
        } catch {
          // A transient read failure (e.g. file deleted between walk
          // and read) just means we treat it as a page route. The next
          // invalidation will pick up the correct classification.
        }
      }),
    );
    return scanRoutes(files, { apiFiles });
  }

  return {
    name: 'mikata-kit',

    config() {
      // Exclude every `@mikata/*` package from Vite's dep pre-bundler.
      // Pre-bundling snapshots the package's `dist/` at dev-server
      // start; rebuilding a workspace Mikata package mid-session
      // leaves the snapshot stale (we've hit this in the docs app as
      // an empty `head.js` with no `useMeta` export, among other
      // symptoms). Sending these through Vite's normal module graph
      // means the file watcher invalidates on change, so
      // `pnpm -C packages/kit build` propagates without a dev-server
      // restart.
      //
      // For users installing from npm this is a cheap no-op — the
      // packages aren't being rebuilt, so the pre-bundling saved
      // nothing anyway. For workspace / contributor setups it
      // eliminates the "why isn't my change showing up" rabbit hole.
      const optimizeDeps = { exclude: MIKATA_PACKAGES };
      // With `appType: 'custom'`, Vite skips its built-in index.html and
      // SPA-fallback middlewares, letting ours take over. We only apply
      // the flag when SSR is enabled — users who pass `ssr: false` want
      // Vite's default SPA dev experience.
      if (ssrOptions) return { appType: 'custom' as const, optimizeDeps };
      return { optimizeDeps };
    },

    configResolved(config) {
      resolvedConfig = config;
      projectRoot = config.root;
      routesDirAbs = toPosix(path.resolve(projectRoot, routesDirRel));
    },

    configureServer(s) {
      server = s;
      // Watch the routes directory. Any add/remove invalidates the
      // virtual module so importers see the new map on the next request.
      const watcher = s.watcher;
      const onChange = (changedPath: string) => {
        if (!changedPath.startsWith(routesDirAbs)) return;
        const mod = s.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
        if (mod) s.moduleGraph.invalidateModule(mod);
        // Nudge the client — the list of routes changed.
        s.ws.send({ type: 'full-reload' });
      };
      watcher.on('add', onChange);
      watcher.on('unlink', onChange);
      watcher.on('change', onChange);

      // Install the SSR middleware AFTER Vite's internal ones so static
      // assets, HMR, and module graph requests are served first. Returning
      // a post-hook achieves that ordering.
      if (!ssrOptions) return;
      return () => {
        s.middlewares.use(
          createSsrMiddleware(s, {
            projectRoot,
            entry: ssrOptions.entry,
            outletMarker: ssrOptions.outletMarker,
          }),
        );
      };
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
      return null;
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null;
      const manifest = await readManifest();
      return generateManifestModule({
        routesDir: routesDirAbs,
        manifest,
      });
    },

    // Run the SSG pass after the SSR build finishes. Vite invokes the
    // build twice in a typical kit app — once for the client bundle and
    // once for the SSR bundle — and we key off `build.ssr` so the client
    // pass is a no-op here. By the time this fires, both
    // `dist/client/index.html` and the SSR entry (`dist/server/...`) are
    // on disk, so we can import the entry and call `prerender()`.
    async closeBundle() {
      if (!prerenderOptions) return;
      if (!resolvedConfig) return;
      if (!resolvedConfig.build.ssr) return;

      const clientDir = path.resolve(projectRoot, prerenderOptions.clientDir);
      const outDir = path.resolve(projectRoot, prerenderOptions.outDir);

      const templatePath = path.join(clientDir, 'index.html');
      let template: string;
      try {
        template = await fs.readFile(templatePath, 'utf-8');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `[mikata-kit prerender] missing ${templatePath}. Build the client bundle first (\`vite build --outDir ${prerenderOptions.clientDir}\`).`,
        );
        throw err;
      }

      // The SSR output dir is this build's `build.outDir`. We need the
      // same filename Vite just wrote; by convention that's the entry
      // stem with a `.js` extension. Pull it out of `rollupOptions.input`
      // to stay robust against renames (e.g. users who rename
      // entry-server.tsx to server.tsx).
      const ssrEntryFilename = resolveSsrEntryFilename(
        resolvedConfig,
        ssrEntryRel,
      );
      const ssrOutDir = path.resolve(
        projectRoot,
        resolvedConfig.build.outDir,
      );
      const entryPath = path.join(ssrOutDir, ssrEntryFilename);

      // Dynamic import via `file://` URL — Windows file paths can't be
      // used as import specifiers directly. The user's server entry is
      // expected to re-export `routes` alongside `render` so the
      // prerender can walk the route tree without a second build pass.
      // (The kit template does this by default.)
      const entryModule = (await import(
        pathToFileURL(entryPath).href
      )) as {
        render: Parameters<typeof prerender>[0]['serverEntry']['render'];
        apiRoutes?: Parameters<typeof prerender>[0]['serverEntry']['apiRoutes'];
        routes?: Parameters<typeof prerender>[0]['routes'];
      };

      if (!entryModule.routes) {
        throw new Error(
          `[mikata-kit prerender] ${entryPath} does not export \`routes\`. ` +
            `Add \`export { default as routes } from 'virtual:mikata-routes';\` to the server entry.`,
        );
      }

      // eslint-disable-next-line no-console
      console.log(`\n[mikata-kit] prerendering → ${path.relative(projectRoot, outDir)}/`);
      const result = await prerender({
        template,
        clientDir,
        outDir,
        serverEntry: entryModule,
        routes: entryModule.routes,
        paths: prerenderOptions.paths,
        baseUrl: prerenderOptions.baseUrl,
        notFoundHtml: prerenderOptions.notFoundHtml,
        fallback: prerenderOptions.fallback,
        // eslint-disable-next-line no-console
        log: (msg) => console.log(msg),
      });

      if (result.errors.length > 0) {
        // eslint-disable-next-line no-console
        console.error(
          `[mikata-kit] prerender finished with ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}:`,
        );
        for (const e of result.errors) {
          // eslint-disable-next-line no-console
          console.error(`  ${e.url}: ${e.error.message}`);
        }
        throw new Error('Prerender failed — see errors above.');
      }
    },
  };
}

interface NormalizedPrerenderOptions {
  outDir: string;
  clientDir: string;
  paths?: readonly string[];
  baseUrl?: string;
  notFoundHtml?: boolean;
  fallback?: 'error' | 'skip';
}

function normalizePrerenderOptions(
  raw: MikataKitOptions['prerender'],
): NormalizedPrerenderOptions | null {
  if (!raw) return null;
  if (raw === true) {
    return { outDir: 'dist/static', clientDir: 'dist/client' };
  }
  return {
    outDir: raw.outDir ?? 'dist/static',
    clientDir: raw.clientDir ?? 'dist/client',
    paths: raw.paths,
    baseUrl: raw.baseUrl,
    notFoundHtml: raw.notFoundHtml,
    fallback: raw.fallback,
  };
}

/**
 * Figure out the filename Vite wrote for the SSR entry. Prefers the
 * rollup input map (handles renames and multi-entry builds), falling
 * back to the `<entry-stem>.js` convention.
 */
function resolveSsrEntryFilename(
  config: ResolvedConfig,
  entryRel: string,
): string {
  const input = config.build.rollupOptions?.input;
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    // Named input map: `{ 'entry-server': 'src/entry-server.tsx' }`
    // becomes `entry-server.js` on disk.
    const keys = Object.keys(input);
    if (keys.length === 1) return keys[0]! + '.js';
  }
  return path.basename(entryRel) + '.js';
}


// ---------------------------------------------------------------------------
// filesystem walk
// ---------------------------------------------------------------------------

async function walk(
  root: string,
  dir: string,
  acc: string[],
  extensions: readonly string[],
): Promise<void> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch (err) {
    // No routes dir yet — that's fine, just emit an empty manifest.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }
  for (const name of names) {
    const full = path.join(dir, name);
    const stat = await fs.stat(full);
    if (stat.isDirectory()) {
      await walk(root, full, acc, extensions);
    } else if (stat.isFile()) {
      const ext = path.extname(name);
      if (!extensions.includes(ext as typeof extensions[number])) continue;
      const rel = toPosix(path.relative(root, full));
      acc.push(rel);
    }
  }
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

export { scanRoutes, generateManifestModule };
export type { RouteManifest, RouteManifestEntry } from './scan-routes';
