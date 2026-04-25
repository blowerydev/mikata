/**
 * Client-side entry helper.
 *
 * Glues `@mikata/router` + `@mikata/runtime.hydrate()` together so a user
 * app can do:
 *
 *   import { mount } from '@mikata/kit/client';
 *   import * as manifest from 'virtual:mikata-routes';
 *   mount(manifest, document.getElementById('root')!);
 *
 * The first argument may be either the whole `virtual:mikata-routes`
 * namespace (recommended) or a bare `RouteDefinition[]` (back-compat).
 * In manifest form, `notFound` and `base` are pulled off the namespace
 * automatically so the call site stays symmetric with `renderRoute()`
 * and avoids a manual `import.meta.env.BASE_URL` read.
 *
 * The virtual manifest supplies dynamic-import-backed route definitions,
 * which the router loads lazily on navigation. On first render, the
 * matched route's server-emitted HTML is adopted in place (see
 * `@mikata/runtime`'s hydration cursor) — no flicker, no repaint.
 *
 * On navigation, any route whose module exports `load()` has that
 * function re-invoked with the fresh `{ params, url }`; the resolved
 * value is written to a reactive loader store so `useLoaderData()`
 * consumers in the new tree see up-to-date data.
 */

import { hydrate, render, lazy, type HydrateDeferStrategy } from '@mikata/runtime';
import { effect } from '@mikata/reactivity';
import {
  createRouter,
  provideRouter,
  routeOutlet,
  type RouteDefinition,
  type Router,
  type RouterOptions,
} from '@mikata/router';

// Narrow local alias for the mutable shape `routeOutlet` reads. Avoids
// pulling in `NormalizedRoute` from @mikata/router internals while still
// capturing the two fields we rewrite after preload.
type NormalizedRouteLike = {
  lazy?: () => Promise<{ default: (props: never) => Node | null }>;
  component?: (props: never) => Node | null;
};
import {
  provideLoaderData,
  createLoaderStore,
  LOADER_DATA_GLOBAL,
  type LoaderData,
  type Loader,
  type LoaderStore,
} from './loader';
import {
  provideActionData,
  createActionStore,
  ACTION_DATA_GLOBAL,
  type ActionData,
  type Action,
  type ActionStore,
} from './action';
import { provideFormContext } from './form';
import { createDomMetaRegistry, provideMetaRegistry } from './head';
import { createBrowserCookies } from './cookies';
import { provideCsrfToken, CSRF_GLOBAL } from './csrf';

/**
 * Signature of the `notFound` entry in a generated `virtual:mikata-routes`
 * manifest: a dynamic-import-backed module loader whose default export is
 * the 404 component. Kit wraps it with `lazy()` so the underlying JS
 * chunk is only fetched when the user hits an unmatched URL.
 */
export type NotFoundModuleLoader = () => Promise<{
  default: (props: Record<string, unknown>) => Node | null;
}>;

/**
 * Shape of the `virtual:mikata-routes` module namespace. Accepted as
 * the first argument of `mount()` and `renderRoute()` so call sites
 * can pass `import * as manifest from 'virtual:mikata-routes'` and
 * skip threading `notFound` / `base` through the options object.
 *
 * The narrower `routes`-array form is still accepted (back-compat) by
 * detecting `Array.isArray(arg)` at the call site.
 */
export interface RouteManifestModule {
  routes: readonly RouteDefinition[];
  notFound?: NotFoundModuleLoader;
  base?: string;
}

/**
 * Normalise either form of the first argument to `mount()` /
 * `renderRoute()` into a uniform `{ routes, notFound, base }` shape.
 * Centralised so both helpers narrow the union the same way - inline
 * `Array.isArray()` ternaries don't narrow generic union types in
 * strict mode.
 */
export function resolveManifestArgument(
  arg: readonly RouteDefinition[] | RouteManifestModule,
): {
  routes: readonly RouteDefinition[];
  notFound: NotFoundModuleLoader | undefined;
  base: string | undefined;
} {
  if (Array.isArray(arg)) {
    return { routes: arg, notFound: undefined, base: undefined };
  }
  const m = arg as RouteManifestModule;
  return { routes: m.routes, notFound: m.notFound, base: m.base };
}

export interface MountOptions extends Omit<RouterOptions, 'routes' | 'notFound'> {
  /**
   * Skip hydration and do a full client render instead. Useful when the
   * container has no pre-rendered content (e.g. plain SPA dev mode).
   * Default: auto-detect by looking for a child node in `container`.
   */
  hydrate?: boolean;
  /**
   * Wait for a readiness signal before hydrating - forwarded as
   * `hydrate({ defer })`. `'css'` is the dev-mode default elsewhere
   * because Vite serves JS and CSS independently and a measure-on-mount
   * component (e.g. a sliding indicator) reads pre-CSS layout. Ignored
   * on plain `render()` mounts (no SSR markup to hydrate).
   */
  defer?: HydrateDeferStrategy;
  /**
   * 404 component loader from the virtual manifest (i.e.
   * `import { notFound } from 'virtual:mikata-routes'`). When present,
   * it's wrapped with `lazy()` and passed to the router so any
   * unmatched URL renders it instead of a blank page. Pulled
   * automatically when the first argument is the manifest namespace.
   */
  notFound?: NotFoundModuleLoader;
}

export interface MountResult {
  router: Router;
  /**
   * Resolves once every `lazy()` matching the initial URL has loaded
   * and `hydrate()` (or `render()`) has attached to the container.
   * Awaiting this is optional — UI is interactive as soon as it
   * resolves, but synchronous setup after `mount()` works regardless
   * because the router is already constructed.
   */
  ready: Promise<void>;
  dispose: () => void;
}

export function mount(
  manifest: readonly RouteDefinition[] | RouteManifestModule,
  container: HTMLElement,
  options: MountOptions = {},
): MountResult {
  // Accept either the legacy `routes`-array first argument or the new
  // manifest-namespace form. In manifest form, `notFound` and `base`
  // default from the namespace; explicit `options` always wins so a
  // caller can override either field locally.
  const resolved = resolveManifestArgument(manifest);
  const routes = resolved.routes;
  const manifestNotFound = resolved.notFound;
  const manifestBase = resolved.base;

  const { hydrate: shouldHydrate, defer: deferStrategy, notFound: notFoundOverride, ...rest } =
    options;
  const notFoundLoader = notFoundOverride ?? manifestNotFound;
  const routerOptions = {
    ...rest,
    base: rest.base ?? manifestBase,
  };

  // Wrap each lazy route so we can intercept the resolved module and
  // capture any `load` / `action` export into side maps. The router
  // still sees a plain `{ default: Component }` result — load-on-nav
  // and form submission are our concern, not the router's.
  const loaders = new Map<string, Loader>();
  const actions = new Map<string, Action>();
  const wrappedRoutes = wrapLazyRoutes([...routes], '', loaders, actions);

  // Wrap the 404 module loader in lazy() so it only fetches on first
  // unmatched URL and shows the router's configured fallback while the
  // chunk is in flight. The router expects `() => Node`, not a module
  // loader — lazy() bridges the two.
  const notFoundComponent = notFoundLoader
    ? lazy(notFoundLoader as Parameters<typeof lazy>[0])
    : undefined;
  const routerNotFound = notFoundComponent
    ? (): Node => notFoundComponent({})
    : undefined;

  const router = createRouter({
    routes: wrappedRoutes,
    ...routerOptions,
    ...(routerNotFound ? { notFound: routerNotFound } : {}),
  });

  // Pick up any loader + action data the server embedded into the page
  // shell. Absent on pure-SPA mounts — we fall back to empty objects so
  // `useLoaderData()` / `useActionData()` cleanly report undefined.
  const embeddedLoader =
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>)[LOADER_DATA_GLOBAL] as
          | LoaderData
          | undefined)
      : undefined;
  const loaderStore = createLoaderStore(embeddedLoader ?? {});

  const embeddedAction =
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>)[ACTION_DATA_GLOBAL] as
          | ActionData
          | undefined)
      : undefined;
  const actionStore = createActionStore(embeddedAction ?? {});

  const headRegistry =
    typeof document !== 'undefined'
      ? createDomMetaRegistry(document.head)
      : null;

  // Pick up the CSRF token the server embedded on initial render. Absent
  // on pure-SPA mounts; `<Form>` falls back to no injection in that case,
  // and actions will reject any submit with 403 — which is what we want
  // when no server primed the cookie.
  const csrfToken =
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>)[CSRF_GLOBAL] as
          | string
          | undefined)
      : undefined;

  function App() {
    provideRouter(router);
    provideLoaderData(loaderStore);
    provideActionData(actionStore);
    provideFormContext({ router, actionStore, loaderStore });
    if (headRegistry) provideMetaRegistry(headRegistry);
    if (csrfToken) provideCsrfToken(csrfToken);
    return routeOutlet();
  }

  const wantsHydrate = shouldHydrate ?? container.firstChild !== null;

  // Preload every `lazy()` on the router's initial match chain and pin
  // the resolved component onto the route definition before
  // hydrate/render runs. Kicking off the import isn't enough: the
  // router's `routeOutlet` wraps each `routeDef.lazy` in a fresh
  // `lazy()` helper with its own `resolved: null`, so the first render
  // returns a placeholder node even when the module is cached. That
  // placeholder is what the hydration cursor would adopt, leaving
  // handlers wired to detached DOM and the server's real tree sitting
  // there inert. Rewriting to `{ component: mod.default, lazy: undefined }`
  // makes routeOutlet take the direct-component branch.
  //
  // Pulling matches from the router (rather than re-running the matcher
  // ourselves) means custom histories — memory, hash, anything that
  // doesn't read `window.location` — preload the routes that will
  // actually render, not the routes that happen to match the browser's
  // current URL.
  let renderDispose: (() => void) | null = null;
  const initial = router.route();
  const matchedLazyRoutes = initial.matches
    .map((m) => m.route as NormalizedRouteLike)
    .filter((r) => typeof r.lazy === 'function');
  const needsNotFound =
    !!(notFoundComponent && initial.matches.length === 0);
  // `defer` only applies to hydrate. render() clears the container and
  // re-renders synchronously - there's no SSR markup to wait for, and
  // delaying a fresh render only widens the visible empty-shell window.
  const attach = async (): Promise<() => void> => {
    if (!wantsHydrate) return render(App, container);
    if (deferStrategy) {
      return hydrate(App, container, { defer: deferStrategy });
    }
    return hydrate(App, container);
  };

  let ready: Promise<void>;
  if (matchedLazyRoutes.length === 0 && !needsNotFound && !deferStrategy) {
    // Nothing to wait on - attach synchronously so tests, SPA dev mode,
    // and any code that expects routeOutlet() to have rendered before
    // the next tick see consistent behaviour.
    renderDispose = wantsHydrate
      ? hydrate(App, container)
      : render(App, container);
    ready = Promise.resolve();
  } else {
    const preloadLazys = Promise.all(
      matchedLazyRoutes.map(async (r) => {
        const mod = (await r.lazy!()) as { default: (p: unknown) => Node };
        // Pin the resolved component. `routeOutlet`'s check is
        // `if (routeDef.lazy) ...else if (routeDef.component)`, so
        // clearing `lazy` flips it onto the direct-component path.
        r.component = mod.default as unknown as typeof r.component;
        r.lazy = undefined;
      }),
    );
    const preloadNotFound = needsNotFound
      ? notFoundComponent!.preload()
      : Promise.resolve();
    ready = Promise.all([preloadLazys, preloadNotFound]).then(async () => {
      renderDispose = await attach();
    });
  }

  // Watch the router's match chain. Each time it changes, fire any
  // `load()` functions we haven't already settled for the current URL.
  // The seeded loader data (from SSR) means the first pass has nothing
  // to fetch; navigation to a new URL re-runs load() for every matched
  // route that has one.
  const loaderDispose = runLoadersOnNav(router, loaders, loaderStore);

  // Drop action results whenever the user navigates away from the route
  // that produced them. Without this a stale `useActionData()` would
  // keep returning the previous submit's result after the user moved on.
  const actionDispose = clearActionsOnNav(router, actionStore);

  return {
    router,
    ready,
    dispose: () => {
      loaderDispose();
      actionDispose();
      if (renderDispose) renderDispose();
    },
  };
}

// Re-export ErrorBoundary so users can wrap route subtrees without
// reaching into @mikata/runtime directly.
export { ErrorBoundary } from '@mikata/runtime';

// ---------------------------------------------------------------------------
// internal: lazy-module interception
// ---------------------------------------------------------------------------

/**
 * Walk the route tree, replacing each `lazy()` with a memoizing shim
 * that resolves the original, records any `load` / `action` exports
 * into their side maps under the route's full path, and returns just
 * the component half to the router.
 */
function wrapLazyRoutes(
  routes: RouteDefinition[],
  parentPath: string,
  loaders: Map<string, Loader>,
  actions: Map<string, Action>,
): RouteDefinition[] {
  return routes.map((route) => {
    const fullPath = joinPaths(parentPath, route.path);
    let wrappedLazy = route.lazy;
    if (route.lazy) {
      const original = route.lazy;
      type LazyResult = Awaited<ReturnType<typeof original>>;
      let cached: Promise<LazyResult> | null = null;
      wrappedLazy = () => {
        if (cached) return cached;
        cached = Promise.resolve(original()).then((mod) => {
          const m = mod as LazyResult & { load?: Loader; action?: Action };
          if (typeof m.load === 'function') loaders.set(fullPath, m.load);
          if (typeof m.action === 'function') actions.set(fullPath, m.action);
          return m;
        });
        return cached;
      };
    }
    const wrappedChildren = route.children
      ? wrapLazyRoutes([...route.children], fullPath, loaders, actions)
      : undefined;
    return { ...route, lazy: wrappedLazy, children: wrappedChildren };
  });
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

// ---------------------------------------------------------------------------
// internal: loader re-run on navigation
// ---------------------------------------------------------------------------

/**
 * Subscribe to `router.route()` and re-run `load()` for each matched
 * route whose module has registered one. Uses a per-path sequence
 * number so a slow response for a route we've already navigated away
 * from cannot overwrite newer data. The first render is seeded from
 * the server payload, so the initial effect pass is a no-op for routes
 * whose data already matches.
 *
 * Returned dispose tears down the effect so host apps that unmount and
 * re-mount the router don't leak subscriptions.
 */
function runLoadersOnNav(
  router: Router,
  loaders: Map<string, Loader>,
  store: LoaderStore,
): () => void {
  // Track the in-flight generation for each fullPath. A resolved
  // promise only writes if its generation still matches the current
  // counter; otherwise a faster navigation has already superseded it.
  const generations = new Map<string, number>();
  // Snapshot of the last URL each path's loader was invoked for, so
  // param/search changes trigger a re-run but a same-URL re-render
  // (e.g. searchParams-only update elsewhere in the tree) doesn't.
  const lastKeyed = new Map<string, string>();

  const dispose = effect(() => {
    const current = router.route();
    // The effect reads the signal; trigger load() outside the sync
    // read-phase so any setData inside the load chain doesn't disturb
    // the in-progress reactive pass.
    queueMicrotask(() => {
      // Build the full URL from window.location so loaders see the
      // same shape they get on the server (pathname + search + hash).
      // current.path is pathname-only; using it would strip query and
      // hash, so loaders that key off `?cursor=…` would silently rerun
      // with the wrong inputs after a query-only navigation.
      // searchParams on the route is schema-filtered and can't be used
      // to rebuild the raw query string without losing extra keys.
      const fullUrl =
        typeof window !== 'undefined' && window.location
          ? window.location.pathname +
            window.location.search +
            window.location.hash
          : current.path;
      for (const match of current.matches) {
        const fullPath = match.route.fullPath;
        const loader = loaders.get(fullPath);
        if (!loader) continue;
        // Key includes params + raw URL so distinct /users/1 → /users/2
        // and ?cursor=A → ?cursor=B navigations both count as
        // different invocations.
        const key = fullUrl + '?' + JSON.stringify(match.params);
        if (lastKeyed.get(fullPath) === key) continue;
        lastKeyed.set(fullPath, key);

        const gen = (generations.get(fullPath) ?? 0) + 1;
        generations.set(fullPath, gen);

        Promise.resolve(
          loader({
            params: match.params,
            url: fullUrl,
            cookies: createBrowserCookies(),
          }),
        )
          .then((value) => {
            if (generations.get(fullPath) === gen) store.set(fullPath, value);
          })
          .catch((err) => {
            if (generations.get(fullPath) === gen) {
              store.setError(fullPath, err);
              // Also log — the error-signal path only reaches consumers
              // that actually read `useLoaderData()`; an unwired route
              // would otherwise fail silently.
              // eslint-disable-next-line no-console
              console.error(`[mikata/kit] load() failed for ${fullPath}:`, err);
            }
          });
      }
    });
  });

  return () => dispose();
}

// ---------------------------------------------------------------------------
// internal: drop action data on navigation
// ---------------------------------------------------------------------------

/**
 * Clear the action store whenever the user navigates to a different URL.
 * Action results are conceptually a reply to a specific submission; once
 * the user moves on, showing the previous response is worse than showing
 * nothing. Same-URL re-renders (e.g. searchParams changes elsewhere) are
 * left alone so the just-submitted result survives incidental refreshes.
 */
function clearActionsOnNav(router: Router, store: ActionStore): () => void {
  let lastPath: string | null = null;
  const dispose = effect(() => {
    const current = router.route();
    if (lastPath !== null && lastPath !== current.path) {
      store.clear();
    }
    lastPath = current.path;
  });
  return () => dispose();
}
