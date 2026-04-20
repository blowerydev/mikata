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
 *   const { html, stateScript } = await renderRoute(routes, { url: req.url });
 *
 * For form submissions (non-GET requests), pass the Request as well:
 *   const result = await renderRoute(routes, { url, request });
 *   // result.redirect is set when the action returned a redirect Response.
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
import {
  provideActionData,
  ACTION_DATA_GLOBAL,
  type Action,
  type ActionData,
  type ActionEntry,
} from './action';
import { createCollectMetaRegistry, provideMetaRegistry } from './head';
import { createCookies } from './cookies';

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
   * The inbound Request. When present and `request.method` isn't GET,
   * the matched leaf route's `action()` (if any) runs before loaders
   * and its result is serialised into the hydration payload. A GET
   * request is equivalent to omitting this option entirely — the
   * action path stays dormant.
   */
  request?: Request;
  /**
   * Raw inbound `Cookie:` header value. Pass `req.headers.cookie` from
   * Node (or `request.headers.get('cookie')` from a Fetch handler) and
   * loaders / actions receive a `cookies` handle that reads against it.
   * Omit (or pass `null`) when there is no inbound cookie header.
   */
  cookieHeader?: string | null;
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
   * is still in `html`). `500` when a loader or action threw.
   * `200` otherwise.
   */
  status: number;
  /**
   * Serialized `<head>` tags collected from `useMeta()` calls inside
   * the rendered tree. The adapter splices this at `<!--mikata-head-->`
   * (or before `</head>` when that marker is absent).
   */
  headTags: string;
  /**
   * Result of every matched route's `load()` — keyed by the route's
   * `fullPath`. Raw map (not serialised); adapters use this for
   * enhanced-submit JSON responses.
   */
  loaderData: Record<string, LoaderEntry>;
  /**
   * Result of the matched leaf route's `action()`, if any ran. Keyed
   * by `fullPath` the same way loaderData is so clients can index into
   * a single map regardless of which route handled the submit.
   */
  actionData: Record<string, ActionEntry>;
  /**
   * Present when a matched action returned a `Response` with a
   * `Location` header (typically from `redirect()`). Adapters forward
   * this as a 302 (or the action's chosen status) + Location header
   * instead of emitting the rendered HTML.
   */
  redirect?: { url: string; status: number };
  /**
   * Serialized `Set-Cookie` header values queued by loaders or the leaf
   * route's action for this request. Adapters append each string as a
   * separate `Set-Cookie` header — the list is in insertion order so a
   * `delete` followed by a `set` for the same name lands on the browser
   * in the intended sequence.
   */
  setCookies: readonly string[];
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
 *
 * When `options.request` is set and its method isn't GET, the matched
 * leaf route's `action()` runs first. If the action returns a Response
 * with a `Location` header the result is surfaced as `redirect` and
 * rendering is skipped; otherwise its value becomes the actionData for
 * that route and loaders run against the post-action state.
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
    const { routes: resolvedRoutes, loaders, actions } = await resolveLazyRoutes(
      routes,
      options.url,
    );
    const { url, request, cookieHeader, notFound: notFoundLoader, ...routerRest } = options;
    // One cookies handle per render: the action (if any) runs first and
    // can queue Set-Cookies (e.g. session commit); loaders run against
    // the same handle so they read the request snapshot — not what the
    // action just queued, since writes don't mutate the snapshot.
    const cookies = createCookies(cookieHeader);

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

    // --- Action phase (non-GET only) ---------------------------------
    // Only the leaf route's action runs — mutating parent actions would
    // be surprising (the URL already identified the thing being mutated).
    // A thrown action surfaces like a loader error: captured in
    // actionData, status bumped to 500, re-raised client-side via
    // useActionData() for an ErrorBoundary to catch.
    const actionData: Record<string, ActionEntry> = {};
    let redirectInfo: { url: string; status: number } | undefined;
    const isMutatingRequest =
      request !== undefined && request.method !== 'GET' && request.method !== 'HEAD';
    if (isMutatingRequest && matches.length > 0) {
      const leaf = matches[matches.length - 1]!;
      const action = actions.get(leaf.route.fullPath);
      if (action) {
        try {
          const result = await action({
            request: request!,
            params: leaf.params,
            url,
            cookies,
          });
          if (result instanceof Response) {
            const location = result.headers.get('Location');
            if (location) {
              redirectInfo = { url: location, status: result.status || 302 };
            } else {
              // A Response without a Location — treat its body as the
              // action result. Most users want redirect() for Responses
              // so this path is intentionally minimal.
              actionData[leaf.route.fullPath] = {
                data: await tryReadResponseBody(result),
              };
            }
          } else {
            actionData[leaf.route.fullPath] = { data: result };
          }
        } catch (err) {
          actionData[leaf.route.fullPath] = {
            error:
              err instanceof Error
                ? { message: err.message, name: err.name }
                : { message: String(err), name: 'Error' },
          };
          if (status === 200) status = 500;
        }
      }
    }

    // Bail out before rendering when the action redirected. Loaders
    // would run against the old URL and any work they did is wasted
    // the instant the client follows the Location header.
    if (redirectInfo) {
      matcher.dispose();
      return {
        html: '',
        stateScript: '',
        state: {},
        status: redirectInfo.status,
        headTags: '',
        loaderData: {},
        actionData,
        redirect: redirectInfo,
        setCookies: [...cookies.outgoing()],
      };
    }

    // --- Loader phase ------------------------------------------------
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
          const value = await loader({ params: match.params, url, cookies });
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
        provideActionData({ ...actionData } as ActionData);
        provideMetaRegistry(headRegistry);
        return routeOutlet();
      }

      return App();
    });

    // Emit a second + third script that mirror the loader and action
    // payloads onto the client. Kept separate from `__MIKATA_STATE__`
    // so existing query-state consumers don't need to branch on
    // whether kit is in use.
    const loaderScript = Object.keys(loaderData).length
      ? renderStateScript(loaderData, LOADER_DATA_GLOBAL)
      : '';
    const actionScript = Object.keys(actionData).length
      ? renderStateScript(actionData, ACTION_DATA_GLOBAL)
      : '';

    return {
      ...rendered,
      stateScript: rendered.stateScript + loaderScript + actionScript,
      status,
      headTags: headRegistry.serialize(),
      loaderData,
      actionData,
      setCookies: [...cookies.outgoing()],
    };
  } finally {
    shim.restore();
  }
}

// Fallback for the rare case of a non-redirect Response: try JSON
// first (the common "action returned new Response(JSON.stringify(...))"
// pattern), fall back to text. Silent on parse failure — the adapter
// will still serialise `undefined` cleanly.
async function tryReadResponseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) return await res.json();
    return await res.text();
  } catch {
    return undefined;
  }
}

/**
 * Walk the route tree, pre-loading lazy modules for every route whose
 * path is a prefix of `url`'s pathname so the server render doesn't
 * stall on a dynamic import. Non-matching lazy routes stay lazy; they
 * still code-split on the client and only load on navigation.
 *
 * Returned `loaders` / `actions` maps are keyed by each resolved route's
 * `fullPath` — the same key the router reports on each
 * `RouteMatch.route.fullPath`, so the render phase can look up a
 * match's handlers in O(1).
 */
async function resolveLazyRoutes(
  routes: readonly RouteDefinition[],
  url: string,
): Promise<{
  routes: RouteDefinition[];
  loaders: Map<string, Loader>;
  actions: Map<string, Action>;
}> {
  const pathname = extractPathname(url);
  const loaders = new Map<string, Loader>();
  const actions = new Map<string, Action>();
  const out: RouteDefinition[] = [];
  for (const route of routes) {
    out.push(await resolveRoute(route, pathname, '', loaders, actions));
  }
  return { routes: out, loaders, actions };
}

async function resolveRoute(
  route: RouteDefinition,
  pathname: string,
  parentPath: string,
  loaders: Map<string, Loader>,
  actions: Map<string, Action>,
): Promise<RouteDefinition> {
  const fullPath = joinPaths(parentPath, route.path);
  const candidate = pathMightMatch(pathname, fullPath);

  const resolvedChildren: RouteDefinition[] | undefined = route.children
    ? await Promise.all(
        route.children.map((c) =>
          resolveRoute(c, pathname, fullPath, loaders, actions),
        ),
      )
    : undefined;

  let component = route.component;
  let lazy = route.lazy;
  if (candidate && lazy && !component) {
    const mod = (await lazy()) as {
      default: RouteDefinition['component'];
      load?: Loader;
      action?: Action;
    };
    component = mod.default;
    if (typeof mod.load === 'function') loaders.set(fullPath, mod.load);
    if (typeof mod.action === 'function') actions.set(fullPath, mod.action);
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
