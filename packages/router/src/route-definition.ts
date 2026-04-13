/**
 * Route definition helpers - defineRoutes() for type inference
 * and route tree normalization for the matching engine.
 */

import type { RouteDefinition, NormalizedRoute } from './types';
import { parseSegments, compilePath } from './matching';

// ---------------------------------------------------------------------------
// defineRoutes - identity function for type inference
// ---------------------------------------------------------------------------

/**
 * Define routes with full type inference for path params.
 * This is an identity function - it returns the same array,
 * but TypeScript infers literal path string types.
 *
 * Usage:
 *   const routes = defineRoutes([
 *     { path: '/', component: Home },
 *     { path: '/users/:id', lazy: () => import('./UserPage') },
 *   ]);
 */
export function defineRoutes<const T extends readonly RouteDefinition[]>(routes: T): T {
  return routes;
}

// ---------------------------------------------------------------------------
// Normalize route tree
// ---------------------------------------------------------------------------

/**
 * Normalize a route tree: resolve full paths, compile regexes,
 * and establish parent references.
 */
export function normalizeRoutes(
  routes: RouteDefinition[],
  parentPath = '',
  parent: NormalizedRoute | null = null
): NormalizedRoute[] {
  return routes.map((route) => {
    const fullPath = joinPaths(parentPath, route.path);
    const { regex, paramNames } = compilePath(fullPath);

    const normalized: NormalizedRoute = {
      fullPath,
      segments: parseSegments(route.path),
      regex,
      paramNames,
      component: route.component,
      lazy: route.lazy,
      search: route.search,
      guard: route.guard,
      meta: route.meta ?? {},
      transition: route.transition,
      children: [],
      parent,
    };

    if (route.children) {
      normalized.children = normalizeRoutes(route.children, fullPath, normalized);
    }

    return normalized;
  });
}

/**
 * Join parent and child paths, handling slashes and edge cases.
 */
function joinPaths(parent: string, child: string): string {
  // Root path
  if (child === '/') return parent || '/';
  if (!parent || parent === '/') {
    return child.startsWith('/') ? child : '/' + child;
  }

  const base = parent.endsWith('/') ? parent.slice(0, -1) : parent;
  const segment = child.startsWith('/') ? child : '/' + child;
  return base + segment;
}

/**
 * Collect all guards from root to the matched route (for a match chain).
 */
export function collectGuards(matches: { route: NormalizedRoute }[]): NonNullable<NormalizedRoute['guard']>[] {
  const guards: NonNullable<NormalizedRoute['guard']>[] = [];
  for (const { route } of matches) {
    if (route.guard) {
      guards.push(route.guard);
    }
  }
  return guards;
}

/**
 * Merge metadata from all matched routes (parent values are overridden by child).
 */
export function mergeMeta(matches: { route: NormalizedRoute }[]): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const { route } of matches) {
    Object.assign(meta, route.meta);
  }
  return meta;
}
