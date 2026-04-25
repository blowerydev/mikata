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
 *   files not ending .tsx/.jsx/.ts/.js/.mdx  →  ignored
 *
 * `.mdx` files are treated as page routes - the default export is the
 * compiled document. API-route classification ignores them: MDX modules
 * don't export HTTP verb functions, so `isApiRouteSource` will never
 * match. `.md` is deliberately not accepted so a route-tree `README.md`
 * stays a README, not a route.
 *
 * API routes (files with no `default` export but with at least one of
 * `GET/POST/PUT/PATCH/DELETE`) follow the same path-derivation rules but
 * are emitted into `apiRoutes` instead of `routes` and bypass layouts —
 * they only ever produce `Response` objects, never UI.
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

/**
 * Flat entry for an API route. Layouts don't apply — the file is loaded
 * directly and a verb handler dispatches the response.
 */
export interface ApiRouteManifestEntry {
  path: string;
  file: string;
  id: string;
}

export interface RouteManifest {
  routes: RouteManifestEntry[];
  layouts: RouteManifestLayout[];
  apiRoutes: ApiRouteManifestEntry[];
  /**
   * POSIX-style path to the top-level `404.tsx` (or equivalent extension)
   * if present in the routes directory. Wired through as the router's
   * `notFound` option and used to produce a 404-status HTML response.
   */
  notFound?: string;
}

export interface ScanOptions {
  /**
   * Set of route files that the caller has identified as API routes —
   * typically by reading the file source and finding no `export default`
   * but at least one `export function GET|POST|PUT|PATCH|DELETE`. The
   * scanner itself stays pure by accepting this classification rather
   * than doing the IO.
   */
  apiFiles?: ReadonlySet<string>;
}

/**
 * Sidebar / nav metadata exported by a route module as `export const nav`.
 * Optional - routes without a `nav` export are simply omitted from the
 * generated nav manifest. A page route exports a single entry; a dynamic
 * route (`[slug].tsx`) exports an array, one entry per concrete URL it
 * generates.
 *
 * `path` is required for array form (the auto-derived path contains a
 * pattern segment like `:package` and can't represent a single nav item).
 * For single-entry form, `path` is filled in by the manifest emitter.
 */
export interface NavEntry {
  /** Display text in the sidebar / top nav. */
  title: string;
  /**
   * Section name. The app keeps a separate ordered list of section
   * names (e.g. `apps/docs/src/sections.ts`) - `section` is matched
   * against that list, and the order of pages within a section is
   * controlled by `order` below.
   */
  section: string;
  /**
   * Order within the section. Lower comes first. Defaults to 0; ties
   * fall back to source order, which matches the route scanner's
   * deterministic file sort.
   */
  order?: number;
  /**
   * Override the auto-derived URL path. Required for dynamic-route
   * pages, which would otherwise carry an unfillable pattern segment.
   * Must start with `/` and not contain pattern segments (`:foo`, `*`).
   */
  path?: string;
}

const ROUTE_EXT_RE = /\.(?:tsx|jsx|ts|js|mjs|cjs|mts|cts|mdx)$/;
const DYNAMIC_SEGMENT_RE = /^\[(\.\.\.)?([A-Za-z_$][\w$]*)\]$/;

/**
 * Scan a flat list of POSIX-style paths relative to the routes root and
 * return the route manifest.
 */
export function scanRoutes(
  files: string[],
  options: ScanOptions = {},
): RouteManifest {
  const apiFiles = options.apiFiles ?? new Set<string>();
  const layouts: RouteManifestLayout[] = [];
  const layoutsByDir = new Map<string, RouteManifestLayout>();
  const routes: RouteManifestEntry[] = [];
  const apiRoutes: ApiRouteManifestEntry[] = [];
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

    // API routes don't participate in the layout tree — they only
    // return Response objects, so there's nothing to wrap. Route into
    // the flat apiRoutes list and skip layout collection.
    if (apiFiles.has(file)) {
      apiRoutes.push({
        path: normalisedPath,
        file,
        id: `api:${file}`,
      });
      continue;
    }

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

  const manifest: RouteManifest = { routes, layouts, apiRoutes };
  if (notFound) manifest.notFound = notFound;
  return manifest;
}

/**
 * Quick heuristic that decides whether a route file's source describes
 * an API route. The rule matches the user-facing convention: no default
 * export, at least one HTTP-verb export. Lives here so the plugin and
 * tests share one definition. False positives are inert (a file with
 * `// export default foo` in a comment would still be an API candidate)
 * but the verb-export requirement keeps random imports from qualifying.
 */
export function isApiRouteSource(source: string): boolean {
  if (/^[ \t]*export\s+default\b/m.test(source)) return false;
  return /^[ \t]*export\s+(?:async\s+)?(?:function|const|let|var)\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/m.test(
    source,
  );
}

/**
 * Pull the value of `export const nav = <object|array literal>;` out of
 * a route source. Returns `null` when there's no nav export, the export
 * isn't a literal, or the literal can't be evaluated as JS.
 *
 * The literal is evaluated via `new Function('return (...)')` at build
 * time. That keeps the scanner free of a JS parser dependency at the
 * cost of a constraint: nav exports must be self-contained literals
 * (string, number, boolean, null, object, array). References to imports
 * or other module-scope bindings won't work - the eval has no scope to
 * read them from. The constraint is documented and the failure mode is
 * a clean `null`, not a crash.
 *
 * Does not validate the shape - the caller is expected to type-narrow
 * via `NavEntry`. A malformed shape will surface when the consumer
 * (Sidebar component, etc.) reads a missing field.
 */
export function extractNavExport(source: string): unknown {
  const startMatch = /export\s+const\s+nav\b(?:\s*:\s*[^=]+)?\s*=\s*/.exec(
    source,
  );
  if (!startMatch) return null;
  const exprStart = startMatch.index + startMatch[0].length;
  const exprText = consumeBalancedExpression(source, exprStart);
  if (exprText === null) return null;
  try {
    // Build-time eval of a literal. The source is the user's own route
    // file - no untrusted-input concern. Wrap in parens so an object
    // literal isn't parsed as a block.
    return new Function('return (' + exprText + ')')();
  } catch {
    return null;
  }
}

/**
 * Walk an object/array literal starting at `start` and return its
 * source text up to and including the matching close brace/bracket.
 * Tracks string and template-literal escapes so braces inside strings
 * don't throw off the depth counter. Returns `null` if the literal
 * isn't balanced (truncated source, etc.).
 */
function consumeBalancedExpression(
  source: string,
  start: number,
): string | null {
  const first = source[start];
  if (first !== '{' && first !== '[') return null;
  const open = first;
  const close = first === '{' ? '}' : ']';
  let depth = 0;
  let inString: string | null = null;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (inString !== null) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inString) inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = c;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
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
