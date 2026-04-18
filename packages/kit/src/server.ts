/**
 * Server-side entry helper.
 *
 * Renders a route tree to HTML for a specific URL. Before handing control
 * to `@mikata/server.renderToString`, this module pre-resolves the lazy
 * imports on the matched route chain so the server produces final markup
 * rather than suspense/fallback placeholders. Unmatched routes still
 * render whatever the router's `notFound` handler produces.
 *
 * Usage:
 *   import { renderRoute } from '@mikata/kit/server';
 *   import routes from 'virtual:mikata-routes';
 *   const { html, stateScript } = await renderRoute(routes, req.url);
 */

import {
  renderToString,
  installShim,
  type RenderToStringResult,
} from '@mikata/server';
import {
  createRouter,
  provideRouter,
  routeOutlet,
  createMemoryHistory,
  type RouteDefinition,
  type RouterOptions,
} from '@mikata/router';

export interface RenderRouteOptions extends Omit<RouterOptions, 'routes' | 'history'> {
  /**
   * Full request URL (including pathname + search + hash). Only the
   * pathname is matched against the routes; the rest is preserved
   * on the router state so the rendered tree can read it.
   */
  url: string;
}

export interface RenderRouteResult extends RenderToStringResult {
  /**
   * HTTP status the caller should respond with. `404` when the URL
   * did not match any route (the `notFound` handler's HTML, if any,
   * is still in `html`). `200` otherwise.
   */
  status: number;
}

/**
 * Render the route matching `url` to HTML. Lazy routes on the match
 * chain are awaited before rendering, so the returned HTML contains
 * final markup rather than router fallbacks.
 */
export async function renderRoute(
  routes: readonly RouteDefinition[],
  options: RenderRouteOptions,
): Promise<RenderRouteResult> {
  // The compiler hoists `_template()` calls to module scope, so
  // dynamic-importing a lazy route eagerly touches `document`. Install
  // the SSR shim before resolving lazy imports so those top-level
  // template calls find the server DOM. `renderToString` installs the
  // shim again internally; the second call is a no-op.
  const shim = installShim();
  try {
    const resolvedRoutes = await resolveLazyRoutes(routes, options.url);
    const { url, ...routerRest } = options;

    // Captured inside the render closure so the server can surface the
    // correct HTTP status without the user wiring up their own plumbing.
    let status = 200;

    const rendered = await renderToString(() => {
      const router = createRouter({
        routes: [...resolvedRoutes],
        history: createMemoryHistory(url),
        ...routerRest,
      });
      if (router.route().matches.length === 0) status = 404;

      function App() {
        provideRouter(router);
        return routeOutlet();
      }

      return App();
    });

    return { ...rendered, status };
  } finally {
    shim.restore();
  }
}

/**
 * Walk the route tree, pre-loading lazy modules for every route whose
 * path is a prefix of `url`'s pathname so the server render doesn't
 * stall on a dynamic import. Non-matching lazy routes stay lazy; they
 * still code-split on the client and only load on navigation.
 */
async function resolveLazyRoutes(
  routes: readonly RouteDefinition[],
  url: string,
): Promise<RouteDefinition[]> {
  const pathname = extractPathname(url);
  const out: RouteDefinition[] = [];
  for (const route of routes) {
    out.push(await resolveRoute(route, pathname, ''));
  }
  return out;
}

async function resolveRoute(
  route: RouteDefinition,
  pathname: string,
  parentPath: string,
): Promise<RouteDefinition> {
  const fullPath = joinPaths(parentPath, route.path);
  const candidate = pathMightMatch(pathname, fullPath);

  const resolvedChildren: RouteDefinition[] | undefined = route.children
    ? await Promise.all(route.children.map((c) => resolveRoute(c, pathname, fullPath)))
    : undefined;

  let component = route.component;
  let lazy = route.lazy;
  if (candidate && lazy && !component) {
    const mod = await lazy();
    component = mod.default as RouteDefinition['component'];
    lazy = undefined;
  }

  return { ...route, component, lazy, children: resolvedChildren };
}

function joinPaths(parent: string, child: string): string {
  if (child === '/' || !child) return parent || '/';
  if (!parent || parent === '/') {
    return child.startsWith('/') ? child : '/' + child;
  }
  const base = parent.endsWith('/') ? parent.slice(0, -1) : parent;
  const segment = child.startsWith('/') ? child : '/' + child;
  return base + segment;
}

/**
 * Cheap prefix match — the router does the authoritative match at
 * render time, but here we only need "could this route participate in
 * the final chain?" so we can decide whether to eagerly await its
 * lazy import. False positives are harmless (we pre-load a route that
 * won't render); false negatives would cause the server to hit a lazy
 * boundary. When in doubt, pre-load.
 */
function pathMightMatch(pathname: string, fullPath: string): boolean {
  if (fullPath === '/' || fullPath === '') return true;
  // Convert :param / * segments into regex wildcards.
  const re = new RegExp(
    '^' +
      fullPath
        .split('/')
        .map((seg) => {
          if (!seg) return '';
          if (seg === '*' || seg === '**') return '/.+';
          if (seg.startsWith(':')) return '/[^/]+';
          return '/' + seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('') +
      '(?:/|$)',
  );
  return re.test(pathname);
}

function extractPathname(url: string): string {
  // Accept both absolute URLs and bare paths.
  if (url.startsWith('/')) {
    const qIdx = url.indexOf('?');
    return qIdx >= 0 ? url.slice(0, qIdx) : url;
  }
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
