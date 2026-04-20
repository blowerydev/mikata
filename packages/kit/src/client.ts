/**
 * Client-side entry helper.
 *
 * Glues `@mikata/router` + `@mikata/runtime.hydrate()` together so a user
 * app can do:
 *
 *   import { mount } from '@mikata/kit/client';
 *   import routes from 'virtual:mikata-routes';
 *   mount(routes, document.getElementById('root')!);
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

import { hydrate, render, lazy } from '@mikata/runtime';
import { effect } from '@mikata/reactivity';
import {
  createRouter,
  provideRouter,
  routeOutlet,
  type RouteDefinition,
  type Router,
  type RouterOptions,
} from '@mikata/router';
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

/**
 * Signature of the `notFound` entry in a generated `virtual:mikata-routes`
 * manifest: a dynamic-import-backed module loader whose default export is
 * the 404 component. Kit wraps it with `lazy()` so the underlying JS
 * chunk is only fetched when the user hits an unmatched URL.
 */
export type NotFoundModuleLoader = () => Promise<{
  default: (props: Record<string, unknown>) => Node | null;
}>;

export interface MountOptions extends Omit<RouterOptions, 'routes' | 'notFound'> {
  /**
   * Skip hydration and do a full client render instead. Useful when the
   * container has no pre-rendered content (e.g. plain SPA dev mode).
   * Default: auto-detect by looking for a child node in `container`.
   */
  hydrate?: boolean;
  /**
   * 404 component loader from the virtual manifest (i.e.
   * `import { notFound } from 'virtual:mikata-routes'`). When present,
   * it's wrapped with `lazy()` and passed to the router so any
   * unmatched URL renders it instead of a blank page.
   */
  notFound?: NotFoundModuleLoader;
}

export interface MountResult {
  router: Router;
  dispose: () => void;
}

export function mount(
  routes: readonly RouteDefinition[],
  container: HTMLElement,
  options: MountOptions = {},
): MountResult {
  const { hydrate: shouldHydrate, notFound: notFoundLoader, ...routerOptions } = options;

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

  function App() {
    provideRouter(router);
    provideLoaderData(loaderStore);
    provideActionData(actionStore);
    provideFormContext({ router, actionStore, loaderStore });
    if (headRegistry) provideMetaRegistry(headRegistry);
    return routeOutlet();
  }

  const wantsHydrate = shouldHydrate ?? container.firstChild !== null;
  const renderDispose = wantsHydrate
    ? hydrate(App, container)
    : render(App, container);

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
    dispose: () => {
      loaderDispose();
      actionDispose();
      renderDispose();
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
      for (const match of current.matches) {
        const fullPath = match.route.fullPath;
        const loader = loaders.get(fullPath);
        if (!loader) continue;
        // Key includes params + raw URL so distinct /users/1 → /users/2
        // navigations count as different invocations.
        const key = current.path + '?' + JSON.stringify(match.params);
        if (lastKeyed.get(fullPath) === key) continue;
        lastKeyed.set(fullPath, key);

        const gen = (generations.get(fullPath) ?? 0) + 1;
        generations.set(fullPath, gen);

        Promise.resolve(
          loader({
            params: match.params,
            url: current.path,
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
