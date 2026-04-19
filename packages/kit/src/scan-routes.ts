/**
 * File-system route scanner.
 *
 * Walks a routes directory and produces an intermediate representation
 * the Vite plugin can serialise into a `virtual:mikata-routes` module.
 * The scanner itself is a pure function of `(files: string[]) => RouteManifest`
 * so it's fully unit-testable without touching the filesystem.
 *
 * Conventions (kept deliberately small for v1):
 *
 *   index.tsx            →  matches the parent path
 *   about.tsx            →  /about
 *   users/[id].tsx       →  /users/:id        (dynamic segment)
 *   blog/[...slug].tsx   →  /blog/*           (catch-all)
 *   _layout.tsx          →  layout; wraps sibling + descendant routes
 *   404.tsx              →  not-found route; rendered when no other route matches
 *                           (only recognised at the top-level routes/ directory)
 *   files prefixed _     →  ignored (except _layout which has special meaning)
 *   files not ending .tsx/.jsx/.ts/.js  →  ignored
 */

export interface RouteManifestEntry {
  /** URL pattern matched by `@mikata/router`. Leading slash, no trailing. */
  path: string;
  /**
   * POSIX-style path from the routes directory to the source file,
   * including the extension. The plugin turns this into a dynamic import.
   */
  file: string;
  /** IDs of layouts wrapping this route, outer-most first. */
  layouts: string[];
  /** Unique identifier; stable across scans for the same file. */
  id: string;
}

export interface RouteManifestLayout {
  id: string;
  file: string;
  /** Parent layout id, if any. Layouts form a tree. */
  parent: string | null;
}

export interface RouteManifest {
  routes: RouteManifestEntry[];
  layouts: RouteManifestLayout[];
  /**
   * POSIX-style path to the top-level `404.tsx` (or equivalent extension)
   * if present in the routes directory. Wired through as the router's
   * `notFound` option and used to produce a 404-status HTML response.
   */
  notFound?: string;
}

const ROUTE_EXT_RE = /\.(?:tsx|jsx|ts|js|mjs|cjs|mts|cts)$/;
const DYNAMIC_SEGMENT_RE = /^\[(\.\.\.)?([A-Za-z_$][\w$]*)\]$/;

/**
 * Scan a flat list of POSIX-style paths relative to the routes root and
 * return the route manifest.
 */
export function scanRoutes(files: string[]): RouteManifest {
  const layouts: RouteManifestLayout[] = [];
  const layoutsByDir = new Map<string, RouteManifestLayout>();
  const routes: RouteManifestEntry[] = [];
  let notFound: string | undefined;

  // Deterministic order so the manifest is stable from one scan to the
  // next. Sorting also ensures a directory's layout is registered before
  // its sibling routes are processed.
  const sorted = [...files].sort();

  // Pass 1 — register layouts first so route entries can link to them.
  for (const file of sorted) {
    if (!ROUTE_EXT_RE.test(file)) continue;
    const segments = file.split('/');
    const basename = segments[segments.length - 1]!;
    const stem = basename.replace(ROUTE_EXT_RE, '');
    if (stem !== '_layout') continue;
    const dir = segments.slice(0, -1).join('/');
    // Parent layout: walk up until we find another _layout.
    let parentDir = parentDirOf(dir);
    let parent: string | null = null;
    while (parentDir !== null) {
      const found = layoutsByDir.get(parentDir);
      if (found) {
        parent = found.id;
        break;
      }
      parentDir = parentDirOf(parentDir);
    }
    const id = `layout:${dir || '/'}`;
    const entry: RouteManifestLayout = { id, file, parent };
    layouts.push(entry);
    layoutsByDir.set(dir, entry);
  }

  // Pass 2 — route entries.
  for (const file of sorted) {
    if (!ROUTE_EXT_RE.test(file)) continue;
    const segments = file.split('/');
    const basename = segments[segments.length - 1]!;
    const stem = basename.replace(ROUTE_EXT_RE, '');
    if (stem.startsWith('_')) continue; // _layout, _private helpers
    // `routes/404.tsx` becomes the not-found fallback instead of a normal
    // route. Only recognised at the top level — nested /foo/404.tsx
    // stays as a plain `/foo/404` route so users who actually want a
    // literal `/404` URL under a subtree aren't surprised.
    if (stem === '404' && segments.length === 1) {
      notFound = file;
      continue;
    }
    const dirSegments = segments.slice(0, -1);
    const pathSegments = dirSegments.map(toPathSegment);
    if (stem !== 'index') {
      pathSegments.push(toPathSegment(stem));
    }
    const path = '/' + pathSegments.filter(Boolean).join('/');
    const normalisedPath = path === '/' ? '/' : path.replace(/\/+$/, '');

    // Collect ancestor layouts, outer-most first.
    const layoutIds: string[] = [];
    let dir: string | null = dirSegments.join('/');
    while (dir !== null) {
      const found = layoutsByDir.get(dir);
      if (found) layoutIds.push(found.id);
      dir = parentDirOf(dir);
    }
    layoutIds.reverse();

    routes.push({
      path: normalisedPath,
      file,
      layouts: layoutIds,
      id: `route:${file}`,
    });
  }

  return notFound ? { routes, layouts, notFound } : { routes, layouts };
}

function toPathSegment(raw: string): string {
  const dyn = DYNAMIC_SEGMENT_RE.exec(raw);
  if (!dyn) return raw;
  const [, rest, name] = dyn;
  // @mikata/router's catch-all is a bare `*` — the parameter is always
  // exposed as `params['*']`. `[...slug]` in a filename documents intent
  // but doesn't carry through to the router yet.
  return rest ? '*' : `:${name}`;
}

function parentDirOf(dir: string): string | null {
  if (dir === '' || dir === '/') return null;
  const i = dir.lastIndexOf('/');
  if (i < 0) return '';
  return dir.slice(0, i);
}
