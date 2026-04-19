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
  renderStateScript,
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
import {
  provideLoaderData,
  LOADER_DATA_GLOBAL,
  type Loader,
  type LoaderData,
  type LoaderEntry,
} from './loader';
import { createCollectMetaRegistry, provideMetaRegistry } from './head';

/**
 * Signature of the `notFound` entry in a generated `virtual:mikata-routes`
 * manifest: a dynamic-import-backed module loader whose default export is
 * the 404 component.
 */
export type NotFoundModuleLoader = () => Promise<{
  default: (props: Record<string, unknown>) => unknown;
}>;

export interface RenderRouteOptions extends Omit<RouterOptions, 'routes' | 'history' | 'notFound'> {
  /**
   * Full request URL (including pathname + search + hash). Only the
   * pathname is matched against the routes; the rest is preserved
   * on the router state so the rendered tree can read it.
   */
  url: string;
  /**
   * 404 component loader from the virtual manifest (i.e.
   * `import { notFound } from 'virtual:mikata-routes'`). When the URL
   * matches no route, its module is awaited and its default export
   * rendered in place; the returned `status` is still `404` so the
   * adapter responds with the right HTTP code.
   */
  notFound?: NotFoundModuleLoader;
}

export interface RenderRouteResult extends RenderToStringResult {
  /**
   * HTTP status the caller should respond with. `404` when the URL
   * did not match any route (the `notFound` handler's HTML, if any,
   * is still in `html`). `200` otherwise.
   */
  status: number;
  /**
   * Serialized `<head>` tags collected from `useMeta()` calls inside
   * the rendered tree. The adapter splices this at `<!--mikata-head-->`
   * (or before `</head>` when that marker is absent).
   */
  headTags: string;
}

/**
 * Render the route matching `url` to HTML. Lazy routes on the match
 * chain are awaited before rendering, so the returned HTML contains
 * final markup rather than router fallbacks.
 *
 * If a matched route's module exports `load`, it is invoked with
 * `{ params, url }` and its resolved value is provided to the tree
 * via `@mikata/kit`'s loader context. Loader data is also embedded
 * in the returned `stateScript` so the client can read it back during
 * hydration.
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
    const { routes: resolvedRoutes, loaders } = await resolveLazyRoutes(
      routes,
      options.url,
    );
    const { url, notFound: notFoundLoader, ...routerRest } = options;

    // Resolve the 404 module eagerly so the render closure can return
    // final HTML for an unmatched URL — the renderToString pass can't
    // `await` inside a component. The extra chunk is cheap in the miss
    // case and skipped entirely when no `routes/404.tsx` is configured.
    let notFoundComponent: (() => unknown) | undefined;
    if (notFoundLoader) {
      const mod = await notFoundLoader();
      notFoundComponent = () => mod.default({});
    }

    // Pre-render pass: build the match chain so we know which loaders
    // to invoke (and so we can surface a 404 status even before the
    // render closure runs). Loaders must finish before the component
    // tree renders so `useLoaderData()` returns seeded data on the
    // first pass — there's no second pass in SSR.
    const matcher = createRouter({
      routes: [...resolvedRoutes],
      history: createMemoryHistory(url),
      ...routerRest,
      ...(notFoundComponent ? { notFound: notFoundComponent as () => Node } : {}),
    });
    const matches = matcher.route().matches;
    let status = matches.length === 0 ? 404 : 200;

    // Invoke loaders in parallel, capturing both successes and failures
    // so a thrown `load()` can surface via `useLoaderData()` → parent
    // ErrorBoundary rather than rejecting `renderRoute` outright.
    // When any loader threw, bump the status to 500 so the HTTP response
    // reflects that the page had a problem even if the fallback rendered
    // clean HTML.
    const loaderData: Record<string, LoaderEntry> = {};
    let anyLoaderErrored = false;
    await Promise.all(
      matches.map(async (match) => {
        const loader = loaders.get(match.route.fullPath);
        if (!loader) return;
        try {
          const value = await loader({ params: match.params, url });
          loaderData[match.route.fullPath] = { data: value };
        } catch (err) {
          anyLoaderErrored = true;
          loaderData[match.route.fullPath] = {
            error:
              err instanceof Error
                ? { message: err.message, name: err.name }
                : { message: String(err), name: 'Error' },
          };
        }
      }),
    );
    if (anyLoaderErrored && status === 200) status = 500;
    matcher.dispose();

    const headRegistry = createCollectMetaRegistry();

    const rendered = await renderToString(() => {
      const router = createRouter({
        routes: [...resolvedRoutes],
        history: createMemoryHistory(url),
        ...routerRest,
        ...(notFoundComponent ? { notFound: notFoundComponent as () => Node } : {}),
      });

      function App() {
        provideRouter(router);
        provideLoaderData({ ...loaderData } as LoaderData);
        provideMetaRegistry(headRegistry);
        return routeOutlet();
      }

      return App();
    });

    // Append a second script that mirrors the loader payload onto the
    // client. Kept separate from `__MIKATA_STATE__` so existing
    // consumers of the query-state global don't need to branch on
    // whether kit is in use.
    const loaderScript = Object.keys(loaderData).length
      ? renderStateScript(loaderData, LOADER_DATA_GLOBAL)
      : '';

    return {
      ...rendered,
      stateScript: rendered.stateScript + loaderScript,
      status,
      headTags: headRegistry.serialize(),
    };
  } finally {
    shim.restore();
  }
}

/**
 * Walk the route tree, pre-loading lazy modules for every route whose
 * path is a prefix of `url`'s pathname so the server render doesn't
 * stall on a dynamic import. Non-matching lazy routes stay lazy; they
 * still code-split on the client and only load on navigation.
 *
 * Returned `loaders` map is keyed by each resolved route's `fullPath`
 * — the same key the router reports on each `RouteMatch.route.fullPath`,
 * so the render phase can look up a match's loader in O(1).
 */
async function resolveLazyRoutes(
  routes: readonly RouteDefinition[],
  url: string,
): Promise<{ routes: RouteDefinition[]; loaders: Map<string, Loader> }> {
  const pathname = extractPathname(url);
  const loaders = new Map<string, Loader>();
  const out: RouteDefinition[] = [];
  for (const route of routes) {
    out.push(await resolveRoute(route, pathname, '', loaders));
  }
  return { routes: out, loaders };
}

async function resolveRoute(
  route: RouteDefinition,
  pathname: string,
  parentPath: string,
  loaders: Map<string, Loader>,
): Promise<RouteDefinition> {
  const fullPath = joinPaths(parentPath, route.path);
  const candidate = pathMightMatch(pathname, fullPath);

  const resolvedChildren: RouteDefinition[] | undefined = route.children
    ? await Promise.all(
        route.children.map((c) => resolveRoute(c, pathname, fullPath, loaders)),
      )
    : undefined;

  let component = route.component;
  let lazy = route.lazy;
  if (candidate && lazy && !component) {
    const mod = (await lazy()) as {
      default: RouteDefinition['component'];
      load?: Loader;
    };
    component = mod.default;
    if (typeof mod.load === 'function') loaders.set(fullPath, mod.load);
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
