/**
 * Static-site generation for `@mikata/kit`.
 *
 * Walks the route tree, classifies leaves as static (e.g. `/about`) or
 * parametric (`/posts/:id`), expands parametric leaves via each route
 * module's optional `getStaticPaths` export, and drives every concrete
 * URL through the Fetch adapter to capture the HTML response. The result
 * is written to `outDir` as a pretty-URL tree (`/about` → `about/index.html`),
 * with the client build's assets copied in alongside so `outDir` is a
 * drop-in static deployment directory.
 *
 * Usage from a build script (or via the Vite plugin's `prerender` option,
 * which wires this up automatically):
 *
 *   import { prerender } from '@mikata/kit/prerender';
 *   import * as serverEntry from './dist/server/entry-server.js';
 *   import routes from './dist/server/virtual-mikata-routes.js';
 *
 *   await prerender({
 *     template: await readFile('./dist/client/index.html', 'utf8'),
 *     clientDir: './dist/client',
 *     outDir: './dist/static',
 *     serverEntry,
 *     routes,
 *   });
 *
 * Design notes:
 *   - Cookies, sessions, CSRF are meaningless at build time — loaders that
 *     read them see an empty snapshot. Any Set-Cookie the render queues is
 *     discarded.
 *   - A parametric route without `getStaticPaths` is skipped with a warning.
 *     Users can still list explicit URLs via the `paths` option as an
 *     escape hatch.
 *   - API routes are not prerendered — they're inherently dynamic.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { RouteDefinition } from '@mikata/router';
import { installShim } from '@mikata/server';
import {
  createFetchHandler,
  type EdgeServerEntry,
} from './adapter-edge';
import { _setVerifyHydration } from './verify-flag';

/**
 * Shape of a route module's optional `getStaticPaths` export. Returns a
 * list of param maps; each map becomes one concrete URL by substituting
 * `:name` segments in the route's path pattern. Sync or async.
 *
 * Example:
 *   // routes/posts/[id].tsx
 *   export function getStaticPaths() {
 *     return [{ id: '1' }, { id: '2' }];
 *   }
 */
export type GetStaticPaths = () =>
  | readonly Record<string, string>[]
  | Promise<readonly Record<string, string>[]>;

/**
 * Module shape the prerender expects when it imports a route's `lazy()`.
 * `default` is the component (same as the router's contract); everything
 * else is optional SSG metadata.
 */
export interface PrerenderableRouteModule {
  default: unknown;
  getStaticPaths?: GetStaticPaths;
}

export interface PrerenderOptions {
  /**
   * Contents of the built `index.html` with the outlet + head markers
   * in place. Typically `await readFile(join(clientDir, 'index.html'))`.
   */
  template: string;
  /**
   * Absolute path to the built client directory (output of the client
   * Vite build). Its contents are copied verbatim into `outDir` so the
   * generated site ships with hashed JS/CSS/fonts/etc. Pass `undefined`
   * to skip copying — the user will handle static assets themselves.
   */
  clientDir?: string;
  /**
   * Absolute path where the prerendered site is written. Existing files
   * are left in place unless overwritten by a generated URL or an asset
   * copied from `clientDir`.
   */
  outDir: string;
  /**
   * The server entry — same shape the edge adapter expects. Must expose
   * `render(ctx)`; `apiRoutes` is ignored at prerender time.
   */
  serverEntry: EdgeServerEntry;
  /**
   * The flat route tree (typically the default export of
   * `virtual:mikata-routes`). The prerender walks this to discover
   * concrete URLs; at each leaf it imports `lazy()` to read an optional
   * `getStaticPaths` export.
   */
  routes: readonly RouteDefinition[];
  /**
   * Extra concrete URLs to render on top of the auto-discovered set. Use
   * this for parametric routes whose `getStaticPaths` you'd rather inline
   * in the build script, or to force additional static paths.
   */
  paths?: readonly string[];
  /**
   * Base URL used to construct the per-page Fetch `Request`. Only the
   * origin matters — `renderRoute` strips it back off and matches on
   * pathname + search. Default: `http://localhost`.
   */
  baseUrl?: string;
  /**
   * Emit a `404.html` in `outDir`. The runner asks the server entry to
   * render a sentinel URL that cannot match any real route; whatever HTML
   * the entry returns (typically from its wired-in `notFound` handler) is
   * written verbatim. Hosts like Netlify, Vercel, Cloudflare Pages and
   * GitHub Pages serve this file for unmatched URLs. Default: `true`.
   */
  notFoundHtml?: boolean;
  /**
   * What to do when a parametric route is discovered with no way to
   * enumerate its instances (no `getStaticPaths` export, and no entry in
   * `paths` whose URL matches the pattern).
   *
   *   - `'error'` (default): throw after the render loop with the list of
   *     skipped patterns. Catches "forgot to add `getStaticPaths`" as a
   *     build failure instead of burying it in log output.
   *   - `'skip'`: record into `result.skipped` and keep going. Use this
   *     while prototyping, or when a route is legitimately dev-only.
   */
  fallback?: 'error' | 'skip';
  /**
   * Logger for progress output. Default: no-op. Pass `console.log` to see
   * each URL as it's generated.
   */
  log?: (message: string) => void;
  /**
   * After rendering each page, re-parse its HTML and run `hydrate()`
   * against it with the same component tree. A mismatch between SSR
   * output and the hydrator's structural expectations (the class of bug
   * that silently shipped to the docs app before we noticed in the
   * browser) fails the build with the URL attached. Default: `true`.
   *
   * Doubles the per-page render cost; set to `false` if you're rendering
   * thousands of pages and have other confidence in hydration.
   */
  verifyHydration?: boolean;
}

export interface PrerenderPageResult {
  /** The concrete URL that was rendered. */
  url: string;
  /** Absolute path to the written HTML file. */
  file: string;
  /** HTTP status the render returned (200 unless a loader failed etc.). */
  status: number;
  /** Byte length of the written HTML. */
  bytes: number;
}

export interface PrerenderSkippedRoute {
  /** The parametric route's full path pattern (e.g. `/posts/:id`). */
  pattern: string;
  /**
   * Why the route was skipped. Most commonly because the leaf had no
   * `getStaticPaths` export and nothing in `paths` covers it.
   */
  reason: string;
}

export interface PrerenderResult {
  /** Every page that was successfully written. */
  pages: readonly PrerenderPageResult[];
  /** URLs that rendered but failed (threw, or the handler returned 500). */
  errors: readonly { url: string; error: Error }[];
  /**
   * Parametric routes the runner couldn't expand — typically because
   * their leaf has no `getStaticPaths` export.
   */
  skipped: readonly PrerenderSkippedRoute[];
}

const DEFAULT_BASE_URL = 'http://localhost';

/**
 * Run the static-site generator. Returns when every URL has been written
 * (or captured as an error) and the asset copy has completed.
 */
export async function prerender(
  options: PrerenderOptions,
): Promise<PrerenderResult> {
  const log = options.log ?? (() => {});
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const outDir = path.resolve(options.outDir);
  const verifyHydration = options.verifyHydration ?? true;
  // Flip the module-level verify flag for the whole prerender run so the
  // user's existing entry-server.tsx (which doesn't know about this
  // option) still triggers the verify pass. Reset in the finally below
  // so a subsequent normal `renderRoute` doesn't inherit the flag.
  _setVerifyHydration(verifyHydration);
  // Install the DOM shim before we start walking the route tree.
  // `flattenRoutes` calls `leaf.lazy()` for every parametric route so it
  // can read `getStaticPaths`, and the compiler hoists `_template(...)`
  // calls to each route module's top level - importing any route module
  // without an active shim crashes on `document is not defined`. Each
  // downstream `renderRoute` (per URL) installs + restores its own shim
  // pair; by the time this `finally` runs, those pairs have returned the
  // globals to their pre-shim state, so this outer `restore()` is an
  // idempotent tail call that also handles the zero-URL case.
  const shim = installShim();
  try {
    return await runPrerender(options, log, baseUrl, outDir);
  } finally {
    _setVerifyHydration(false);
    shim.restore();
  }
}

async function runPrerender(
  options: PrerenderOptions,
  log: (message: string) => void,
  baseUrl: string,
  outDir: string,
): Promise<PrerenderResult> {
  await fs.mkdir(outDir, { recursive: true });

  // Copy the client build verbatim so `outDir` is ready to deploy. Pages
  // overwritten below will replace any HTML copied here (including the
  // root `index.html`), which is the intended precedence: static HTML
  // always wins over whatever Vite emitted.
  if (options.clientDir) {
    const clientAbs = path.resolve(options.clientDir);
    await copyDir(clientAbs, outDir);
  }

  const handler = createFetchHandler({
    template: options.template,
    serverEntry: options.serverEntry,
  });

  // Flatten the route tree into leaves keyed by their full path.
  const leaves = flattenRoutes(options.routes);
  const urls: string[] = [];
  const skipped: PrerenderSkippedRoute[] = [];

  for (const leaf of leaves) {
    if (!hasParams(leaf.fullPath)) {
      urls.push(leaf.fullPath);
      continue;
    }
    // Parametric: try `getStaticPaths` on the leaf's module.
    if (!leaf.lazy) {
      skipped.push({
        pattern: leaf.fullPath,
        reason: 'parametric route has no lazy import — cannot read getStaticPaths',
      });
      continue;
    }
    const mod = (await leaf.lazy()) as PrerenderableRouteModule;
    if (typeof mod.getStaticPaths !== 'function') {
      skipped.push({
        pattern: leaf.fullPath,
        reason: 'parametric route has no getStaticPaths() export',
      });
      continue;
    }
    const entries = await mod.getStaticPaths();
    for (const entry of entries) {
      urls.push(substitutePath(leaf.fullPath, entry));
    }
  }

  // Explicit `paths` overrides — appended so user-provided URLs always
  // get rendered even if auto-discovery dropped them.
  if (options.paths) {
    for (const p of options.paths) urls.push(p);
  }

  // De-duplicate. `getStaticPaths` can legitimately return overlapping
  // entries across sibling routes, and `paths` may re-list an auto-
  // discovered URL. Rendering the same URL twice is waste — keep the
  // first occurrence so user-supplied ordering wins the "last write".
  const seen = new Set<string>();
  const uniqueUrls = urls.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  const pages: PrerenderPageResult[] = [];
  const errors: { url: string; error: Error }[] = [];

  for (const url of uniqueUrls) {
    try {
      const res = await handler(new Request(baseUrl + url));
      const html = await res.text();
      const file = resolveOutputFile(outDir, url);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, html, 'utf8');
      log(`  ${pad(res.status)} ${url}  →  ${path.relative(outDir, file)}`);
      pages.push({
        url,
        file,
        status: res.status,
        bytes: Buffer.byteLength(html, 'utf8'),
      });
    } catch (err) {
      errors.push({
        url,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  // 404 page — render via a synthetic URL that definitely won't match any
  // of the user's routes. When the entry wires `notFound` into
  // `renderRoute`, the response is the 404 component's HTML + status 404;
  // when it doesn't, whatever the entry returns is what we write. Either
  // way, that's the file the static host will serve for unmatched URLs.
  const shouldEmit404 = options.notFoundHtml ?? true;
  if (shouldEmit404) {
    try {
      // A path no user would reasonably write; underscored prefix
      // minimises collision with real routes.
      const sentinel = '/__mikata_kit_404__';
      const res = await handler(new Request(baseUrl + sentinel));
      const html = await res.text();
      const file = path.join(outDir, '404.html');
      await fs.writeFile(file, html, 'utf8');
      log(`  ${pad(res.status)} 404  →  404.html`);
      pages.push({
        url: sentinel,
        file,
        status: res.status,
        bytes: Buffer.byteLength(html, 'utf8'),
      });
    } catch (err) {
      errors.push({
        url: '<404>',
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  if (skipped.length > 0) {
    log(`  skipped ${skipped.length} parametric route${skipped.length === 1 ? '' : 's'}:`);
    for (const s of skipped) log(`    - ${s.pattern}  (${s.reason})`);
  }

  // A skipped pattern is fine — intended, even — when the user covers it
  // through `options.paths`. Only the residue (skipped AND not covered)
  // triggers the build error, so the `paths` escape hatch actually feels
  // like one.
  const uncovered = skipped.filter(
    (s) => !options.paths?.some((p) => pathMatchesPattern(p, s.pattern)),
  );
  const fallback = options.fallback ?? 'error';
  if (fallback === 'error' && uncovered.length > 0) {
    const lines = uncovered.map((s) => `  - ${s.pattern}  (${s.reason})`);
    throw new Error(
      `[mikata/kit prerender] ${uncovered.length} parametric route${uncovered.length === 1 ? '' : 's'} could not be enumerated:\n` +
        lines.join('\n') +
        `\n\nFix: add a \`getStaticPaths()\` export to each route file, list concrete URLs via the \`paths\` option, or pass \`fallback: 'skip'\` to allow the build to proceed.`,
    );
  }

  return { pages, errors, skipped };
}

/**
 * Test whether `url` is a concrete instance of `pattern`. Segments that
 * are `:name` in the pattern match anything up to the next slash; `*`
 * matches any suffix. Used to decide whether a user-supplied path in
 * `options.paths` covers a parametric route's pattern (in which case the
 * route is intentionally-enumerated and the `fallback: 'error'` check
 * should let it through).
 */
function pathMatchesPattern(url: string, pattern: string): boolean {
  const regexSource =
    '^' +
    pattern
      .split('/')
      .map((seg) => {
        if (seg === '*' || seg === '**') return '.*';
        if (seg.startsWith(':')) return '[^/]+';
        return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/') +
    '$';
  try {
    return new RegExp(regexSource).test(url);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Route tree → leaf list
// ---------------------------------------------------------------------------

interface RouteLeaf {
  fullPath: string;
  lazy?: () => Promise<{ default: unknown }>;
}

/**
 * Walk the nested route tree and collect every leaf along with its full
 * path. A leaf is a node with a `lazy` (or `component`) and no children;
 * layout nodes (`_layout.tsx` → emitted as `{ path: '/', children: ... }`)
 * contribute their `path` to the accumulated prefix but aren't themselves
 * leaves.
 */
function flattenRoutes(routes: readonly RouteDefinition[]): RouteLeaf[] {
  const leaves: RouteLeaf[] = [];
  const walk = (route: RouteDefinition, parentPath: string): void => {
    const full = joinPaths(parentPath, route.path);
    const hasChildren = !!route.children && route.children.length > 0;
    if (hasChildren) {
      for (const child of route.children!) walk(child, full);
      return;
    }
    leaves.push({ fullPath: full, lazy: route.lazy });
  };
  for (const route of routes) walk(route, '');
  return leaves;
}

function joinPaths(parent: string, child: string): string {
  if (!child || child === '/') return parent || '/';
  if (!parent || parent === '/') {
    return child.startsWith('/') ? child : '/' + child;
  }
  const base = parent.endsWith('/') ? parent.slice(0, -1) : parent;
  const segment = child.startsWith('/') ? child : '/' + child;
  return base + segment;
}

// ---------------------------------------------------------------------------
// Param substitution
// ---------------------------------------------------------------------------

const PARAM_RE = /:([A-Za-z_$][\w$]*)|\*/g;

/**
 * Replace each `:name` and `*` segment in `pattern` with the corresponding
 * entry from `params`. Values are URL-encoded so user-supplied slugs with
 * slashes / spaces don't silently break matching. Missing params throw —
 * the mismatch usually indicates a typo in `getStaticPaths`.
 */
function substitutePath(
  pattern: string,
  params: Record<string, string>,
): string {
  return pattern.replace(PARAM_RE, (match, name: string | undefined) => {
    const key = name ?? '*';
    const value = params[key];
    if (value === undefined) {
      throw new Error(
        `[mikata/kit prerender] getStaticPaths() for ${pattern} is missing the "${key}" param`,
      );
    }
    return encodeURIComponent(value);
  });
}

function hasParams(pattern: string): boolean {
  return /:[A-Za-z_$]|\*/.test(pattern);
}

// ---------------------------------------------------------------------------
// URL → output file
// ---------------------------------------------------------------------------

/**
 * Map a URL to its on-disk location. Pretty URLs by default:
 *   /             → {outDir}/index.html
 *   /about        → {outDir}/about/index.html
 *   /posts/42     → {outDir}/posts/42/index.html
 */
function resolveOutputFile(outDir: string, url: string): string {
  const pathname = url.split('?')[0]!.split('#')[0]!;
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return path.join(outDir, 'index.html');
  const decoded = clean.split('/').map((s) => decodeURIComponent(s));
  return path.join(outDir, ...decoded, 'index.html');
}

// ---------------------------------------------------------------------------
// Client dir → out dir copy
// ---------------------------------------------------------------------------

/**
 * Recursively copy `src` into `dst`. Prefers `fs.cp` (Node ≥ 16.7) for a
 * single atomic call, falling back to a manual recurse for older runtimes.
 * `dereference: true` so any symlinks in the client build turn into real
 * files — static hosts rarely handle symlinks well.
 */
async function copyDir(src: string, dst: string): Promise<void> {
  const cp = (fs as typeof fs & {
    cp?: (s: string, d: string, opts: { recursive: boolean; dereference: boolean }) => Promise<void>;
  }).cp;
  if (typeof cp === 'function') {
    await cp(src, dst, { recursive: true, dereference: true });
    return;
  }
  // Fallback for ancient Node versions — rare at this point but cheap.
  await manualCopy(src, dst);
}

async function manualCopy(src: string, dst: string): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(src, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }
  await fs.mkdir(dst, { recursive: true });
  for (const entry of entries) {
    const name = String(entry.name);
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (entry.isDirectory()) {
      await manualCopy(s, d);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      await fs.copyFile(s, d);
    }
  }
}

function pad(n: number): string {
  return String(n).padEnd(3, ' ');
}
