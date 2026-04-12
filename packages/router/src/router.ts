/**
 * Core router — createRouter() factory.
 *
 * Owns signal state, orchestrates navigation (guards, history, signals,
 * scroll restoration), and exposes the Router interface.
 */

import { signal, computed, batch } from '@mikata/reactivity';
import type {
  Router,
  RouterOptions,
  MatchedRoute,
  NavigateTarget,
  NavigateOptions,
  NormalizedRoute,
  HistoryAdapter,
  RouteGuard,
  GuardResult,
} from './types';
import { normalizeRoutes, collectGuards, mergeMeta } from './route-definition';
import { matchRouteTree } from './matching';
import { parseSearchParams, serializeSearchParams } from './search-params';
import { createBrowserHistory, createHashHistory, createMemoryHistory } from './history';
import { runGuards } from './guards';
import { createScrollManager, type ScrollManager } from './scroll';

declare const __DEV__: boolean;

// ---------------------------------------------------------------------------
// createRouter
// ---------------------------------------------------------------------------

export function createRouter(options: RouterOptions): Router {
  const {
    routes: rawRoutes,
    history: historyMode = 'browser',
    base = '',
    scrollBehavior,
    notFound,
    beforeNavigate,
    afterNavigate,
  } = options;

  // Normalize routes
  const normalizedRoutes = normalizeRoutes(rawRoutes as any);

  // Create history adapter
  let history: HistoryAdapter;
  if (typeof historyMode === 'object' && historyMode !== null) {
    history = historyMode;
  } else if (historyMode === 'hash') {
    history = createHashHistory();
  } else if (historyMode === 'memory') {
    history = createMemoryHistory();
  } else {
    history = createBrowserHistory(base);
  }

  // Global guards
  const globalGuards: RouteGuard[] = beforeNavigate
    ? Array.isArray(beforeNavigate)
      ? beforeNavigate
      : [beforeNavigate]
    : [];

  const afterGuards = afterNavigate
    ? Array.isArray(afterNavigate)
      ? afterNavigate
      : [afterNavigate]
    : [];

  // Component-level guards (registered via useGuard)
  const componentGuards = new Set<RouteGuard>();

  // Scroll manager
  let scrollManager: ScrollManager | null = null;
  if (scrollBehavior !== false && typeof window !== 'undefined') {
    scrollManager = createScrollManager(scrollBehavior);
  }

  // --- Reactive State ---
  const emptyRoute: MatchedRoute = {
    path: '/',
    params: {},
    searchParams: {},
    meta: {},
    hash: '',
    matches: [],
  };

  const [currentRoute, setCurrentRoute] = signal<MatchedRoute>(emptyRoute);
  const [isNavigating, setIsNavigating] = signal(false);

  // Derived signals
  const params = computed(() => currentRoute().params);
  const searchParamsSignal = computed(() => currentRoute().searchParams);
  const path = computed(() => currentRoute().path);
  const hash = computed(() => currentRoute().hash);

  // --- Initial route resolution ---
  resolveAndSet(history.location.pathname, history.location.search, history.location.hash);

  // --- Listen for history changes (back/forward) ---
  const unlisten = history.listen((location) => {
    const prevRoute = currentRoute();
    if (scrollManager) {
      scrollManager.save(prevRoute.path);
    }
    resolveAndSet(location.pathname, location.search, location.hash);
    if (scrollManager) {
      scrollManager.restore(currentRoute().path);
    }
  });

  // ---------------------------------------------------------------------------
  // Route resolution
  // ---------------------------------------------------------------------------

  function resolveAndSet(pathname: string, search: string, hashStr: string): MatchedRoute {
    const matches = matchRouteTree(pathname, normalizedRoutes);

    if (!matches) {
      const route: MatchedRoute = {
        path: pathname,
        params: {},
        searchParams: {},
        meta: {},
        hash: hashStr.replace('#', ''),
        matches: [],
      };
      setCurrentRoute(route);
      return route;
    }

    // Merge params from all match levels
    const mergedParams: Record<string, string> = {};
    for (const m of matches) {
      Object.assign(mergedParams, m.params);
    }

    // Get search schema from the deepest matched route
    const leafRoute = matches[matches.length - 1].route;
    const searchSchema = leafRoute.search;
    const parsedSearch = parseSearchParams(search, searchSchema);

    const route: MatchedRoute = {
      path: pathname,
      params: mergedParams,
      searchParams: parsedSearch,
      meta: mergeMeta(matches),
      hash: hashStr.replace('#', ''),
      matches,
    };

    setCurrentRoute(route);
    return route;
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async function navigate(
    to: NavigateTarget,
    opts: NavigateOptions = {}
  ): Promise<void> {
    const targetPath = resolveTarget(to, currentRoute());
    const prevRoute = currentRoute();

    setIsNavigating(true);

    try {
      // Build a provisional matched route for guard evaluation
      const [pathname, searchAndHash] = splitPathAndSearch(targetPath);
      const [search, hashPart] = splitSearchAndHash(searchAndHash);
      const provisionalMatches = matchRouteTree(pathname, normalizedRoutes);

      const provisionalRoute: MatchedRoute = provisionalMatches
        ? (() => {
            const mergedParams: Record<string, string> = {};
            for (const m of provisionalMatches) Object.assign(mergedParams, m.params);
            const leafRoute = provisionalMatches[provisionalMatches.length - 1].route;
            return {
              path: pathname,
              params: mergedParams,
              searchParams: parseSearchParams(search, leafRoute.search),
              meta: mergeMeta(provisionalMatches),
              hash: hashPart.replace('#', ''),
              matches: provisionalMatches,
            };
          })()
        : {
            path: pathname,
            params: {},
            searchParams: {},
            meta: {},
            hash: hashPart.replace('#', ''),
            matches: [],
          };

      // Run guards: global → route-level → component-level
      const routeGuards = provisionalMatches
        ? collectGuards(provisionalMatches)
        : [];
      const allGuards = [
        ...globalGuards,
        ...routeGuards,
        ...componentGuards,
      ];

      if (allGuards.length > 0) {
        const result = await runGuards(allGuards, provisionalRoute, prevRoute);
        if (result === false) {
          setIsNavigating(false);
          return;
        }
        if (result !== true && result != null) {
          // Redirect
          setIsNavigating(false);
          await navigate(result, { replace: true });
          return;
        }
      }

      // Save scroll position for current route
      if (scrollManager) {
        scrollManager.save(prevRoute.path);
      }

      // Update history
      if (opts.replace) {
        history.replace(targetPath, opts.state);
      } else {
        history.push(targetPath, opts.state);
      }

      // Update reactive state
      resolveAndSet(pathname, search, hashPart);

      // Notify after-navigate callbacks
      const newRoute = currentRoute();
      for (const fn of afterGuards) {
        fn(newRoute, prevRoute);
      }

      // Scroll restoration
      if (opts.scroll !== false && scrollManager) {
        if (typeof opts.scroll === 'object') {
          window.scrollTo(opts.scroll.x, opts.scroll.y);
        } else if (newRoute.hash) {
          const el = document.getElementById(newRoute.hash);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        } else {
          scrollManager.scrollToTop();
        }
      }
    } finally {
      setIsNavigating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // setSearchParams
  // ---------------------------------------------------------------------------

  function setSearchParams(
    updater: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)
  ): void {
    const current = currentRoute();
    const newParams = typeof updater === 'function'
      ? updater(current.searchParams)
      : { ...current.searchParams, ...updater };

    // Find the search schema from current route
    const leafMatch = current.matches[current.matches.length - 1];
    const schema = leafMatch?.route.search;

    const searchString = serializeSearchParams(newParams, schema);
    const newPath = current.path + searchString + (current.hash ? '#' + current.hash : '');

    history.replace(newPath);

    setCurrentRoute({
      ...current,
      searchParams: newParams,
    });
  }

  // ---------------------------------------------------------------------------
  // Router instance
  // ---------------------------------------------------------------------------

  const router: Router & { _componentGuards: Set<RouteGuard>; _options: RouterOptions; _normalizedRoutes: NormalizedRoute[] } = {
    route: currentRoute,
    params,
    searchParams: searchParamsSignal,
    path,
    hash,
    isNavigating,
    navigate,
    back: () => history.go(-1),
    forward: () => history.go(1),
    go: (delta: number) => history.go(delta),
    setSearchParams,
    dispose() {
      unlisten();
      history.dispose();
      scrollManager?.dispose();
    },

    // Internal — used by useGuard
    _componentGuards: componentGuards,
    _options: options,
    _normalizedRoutes: normalizedRoutes,
  };

  return router;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveTarget(to: NavigateTarget, current: MatchedRoute): string {
  if (typeof to === 'string') return to;

  let path = to.path;

  // Substitute params
  if (to.params) {
    for (const [key, value] of Object.entries(to.params)) {
      path = path.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }

  // Append search
  if (to.search) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(to.search)) {
      if (value != null) {
        params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    }
    const str = params.toString();
    if (str) path += '?' + str;
  }

  // Append hash
  if (to.hash) {
    path += to.hash.startsWith('#') ? to.hash : '#' + to.hash;
  }

  return path;
}

function splitPathAndSearch(url: string): [string, string] {
  const qIdx = url.indexOf('?');
  const hIdx = url.indexOf('#');
  const splitIdx = qIdx >= 0 ? qIdx : hIdx >= 0 ? hIdx : -1;
  if (splitIdx < 0) return [url, ''];
  return [url.slice(0, splitIdx), url.slice(splitIdx)];
}

function splitSearchAndHash(searchAndHash: string): [string, string] {
  const hIdx = searchAndHash.indexOf('#');
  if (hIdx < 0) return [searchAndHash, ''];
  return [searchAndHash.slice(0, hIdx), searchAndHash.slice(hIdx)];
}
