/**
 * Serialises a route manifest into the source of a JavaScript module that
 * the user's app can import. The generated module default-exports an
 * array of route definitions compatible with `@mikata/router`.
 *
 * Each route entry uses a dynamic import so Vite can code-split it; the
 * component is pulled out of `.default` on the imported module.
 */

import type { RouteManifest, RouteManifestEntry, RouteManifestLayout } from './scan-routes';

export interface GenerateManifestOptions {
  /**
   * Absolute posix path to the routes directory. Generated dynamic
   * imports are anchored at this path.
   */
  routesDir: string;
  /**
   * Manifest produced by `scanRoutes()`.
   */
  manifest: RouteManifest;
}

/**
 * Produce the source of a module that exports:
 *   - `routes`: an array of `@mikata/router` RouteDefinition objects with
 *     nested layouts reified as parent routes.
 *   - default export === `routes`.
 */
export function generateManifestModule(opts: GenerateManifestOptions): string {
  const { routesDir, manifest } = opts;

  const layoutById = new Map<string, RouteManifestLayout>();
  for (const layout of manifest.layouts) layoutById.set(layout.id, layout);

  // Build a tree where every layout becomes a parent route and every
  // route slots under its deepest layout. Routes without layouts sit at
  // the top level. This mirrors `defineRoutes([{ children: [...] }])`.
  interface Node {
    path: string;
    file?: string;
    layoutId?: string;
    children: Node[];
  }

  const root: Node = { path: '/', children: [] };

  const nodeForLayout = new Map<string, Node>();

  function ensureLayoutChain(layoutId: string): Node {
    if (nodeForLayout.has(layoutId)) return nodeForLayout.get(layoutId)!;
    const layout = layoutById.get(layoutId)!;
    const parent = layout.parent ? ensureLayoutChain(layout.parent) : root;
    const node: Node = {
      // Layout routes don't add a path segment — they exist purely to
      // wrap children. Using '/' collapses into the parent during
      // normalisation.
      path: '/',
      file: layout.file,
      layoutId,
      children: [],
    };
    parent.children.push(node);
    nodeForLayout.set(layoutId, node);
    return node;
  }

  for (const route of manifest.routes) {
    const deepest = route.layouts[route.layouts.length - 1];
    const parent = deepest ? ensureLayoutChain(deepest) : root;
    const routeNode: Node = {
      path: rebasePath(route.path, parent),
      file: route.file,
      children: [],
    };
    parent.children.push(routeNode);
  }

  const imports: string[] = [];
  let nextImportId = 0;
  function emitImport(file: string): string {
    const id = `_r${nextImportId++}`;
    const spec = JSON.stringify(joinPosix(routesDir, file));
    imports.push(`const ${id} = () => import(${spec});`);
    return id;
  }

  function emitNode(node: Node): string {
    const parts: string[] = [];
    parts.push(`path: ${JSON.stringify(node.path)}`);
    if (node.file) {
      const imp = emitImport(node.file);
      parts.push(`lazy: ${imp}`);
    }
    if (node.children.length > 0) {
      const kids = node.children.map(emitNode).join(', ');
      parts.push(`children: [${kids}]`);
    }
    return `{ ${parts.join(', ')} }`;
  }

  // Skip the synthetic root node — emit its children directly.
  const topLevel = root.children.map(emitNode).join(', ');
  return (
    imports.join('\n') +
    (imports.length ? '\n\n' : '') +
    `export const routes = [${topLevel}];\n` +
    'export default routes;\n'
  );
}

function joinPosix(a: string, b: string): string {
  if (!a) return b;
  if (a.endsWith('/')) return a + b;
  return `${a}/${b}`;
}

/**
 * When a route sits inside a layout its effective path is still
 * absolute, but `@mikata/router` concatenates parent + child paths
 * during normalisation. Our layout nodes use `'/'` (no segment), so
 * absolute child paths flow through unchanged. Kept as a helper so
 * future conventions (e.g. group folders `(marketing)/`) can reshape
 * the math in one place.
 */
function rebasePath(path: string, _parent: { path: string }): string {
  return path;
}
