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
import type { Plugin, ViteDevServer } from 'vite';
import { scanRoutes, type RouteManifest } from './scan-routes';
import { generateManifestModule } from './generate-manifest';
import { createSsrMiddleware } from './middleware';

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
}

const VIRTUAL_ID = 'virtual:mikata-routes';
// Vite convention: resolved id must start with a `\0` so other plugins
// know not to try and read it from disk.
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;

const DEFAULT_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'] as const;

export default function mikataKit(options: MikataKitOptions = {}): Plugin {
  const routesDirRel = options.routesDir ?? 'src/routes';
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const ssrOptions = options.ssr === false ? null : (options.ssr ?? {});

  let server: ViteDevServer | undefined;
  let projectRoot = '';
  let routesDirAbs = '';

  async function readManifest(): Promise<RouteManifest> {
    const files: string[] = [];
    await walk(routesDirAbs, routesDirAbs, files, extensions);
    return scanRoutes(files);
  }

  return {
    name: 'mikata-kit',

    config() {
      // With `appType: 'custom'`, Vite skips its built-in index.html and
      // SPA-fallback middlewares, letting ours take over. We only apply
      // the flag when SSR is enabled — users who pass `ssr: false` want
      // Vite's default SPA dev experience.
      if (ssrOptions) return { appType: 'custom' };
      return undefined;
    },

    configResolved(config) {
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
  };
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
