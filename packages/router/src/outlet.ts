/**
 * routeOutlet() — renders the matched route component at the current depth.
 * provideRouter() — provides the router to the component tree via context.
 *
 * Follows the same DOM-swapping pattern as show() in control-flow.ts:
 * renderEffect + createScope + replaceChild.
 */

import {
  renderEffect,
  createScope,
  computed,
  onCleanup,
  type Scope,
} from '@mikata/reactivity';
import {
  createContext,
  provide,
  inject,
  lazy as lazyComponent,
} from '@mikata/runtime';
import type { Router, RouterOptions, NormalizedRoute, TransitionOptions } from './types';

declare const __DEV__: boolean;

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

interface RouterContextValue {
  router: Router & { _options: RouterOptions; _normalizedRoutes: NormalizedRoute[]; _componentGuards: Set<any> };
}

interface OutletContextValue {
  depth: number;
}

const RouterContext = createContext<RouterContextValue>();
const OutletContext = createContext<OutletContextValue>({ depth: 0 });

// ---------------------------------------------------------------------------
// provideRouter
// ---------------------------------------------------------------------------

/**
 * Provide the router instance to the component tree.
 * Must be called inside a component setup function.
 *
 * Usage:
 *   function App() {
 *     provideRouter(router);
 *     return <div>{routeOutlet()}</div>;
 *   }
 */
export function provideRouter(router: Router): void {
  provide(RouterContext, { router: router as any });
  provide(OutletContext, { depth: 0 });
}

// ---------------------------------------------------------------------------
// routeOutlet
// ---------------------------------------------------------------------------

/**
 * Render the matched route component at the current depth.
 * Returns a DOM node that reactively swaps when the route changes.
 *
 * Usage:
 *   function Layout() {
 *     return <div>{routeOutlet()}</div>;
 *   }
 */
export function routeOutlet(options?: {
  transition?: TransitionOptions;
}): Node {
  const routerCtx = inject(RouterContext);
  const { router } = routerCtx;
  const { depth } = inject(OutletContext);

  let currentNode: Node = document.createComment('route-outlet');
  let currentScope: Scope | null = null;
  let currentKey: string | null = null;

  // Track which route component is rendered at this depth
  const matchAtDepth = computed(() => {
    const route = router.route();
    return route.matches[depth] ?? null;
  });

  /**
   * Provide both RouterContext and OutletContext into a child scope.
   * This ensures nested routeOutlet() calls can inject the router
   * even when the scope chain crosses renderEffect boundaries.
   */
  function provideChildContexts(nextDepth: number): void {
    provide(RouterContext, routerCtx);
    provide(OutletContext, { depth: nextDepth });
  }

  renderEffect(() => {
    const match = matchAtDepth();
    const routeDef = match?.route;
    const key = routeDef?.fullPath ?? null;

    // Same route component — don't swap
    if (key === currentKey) return;
    currentKey = key;

    // Dispose previous scope
    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }

    let newNode: Node;

    if (!routeDef) {
      // No match at this depth — show notFound or empty
      const notFound = (router as any)._options.notFound;
      if (notFound) {
        const scope = createScope(() => {
          provideChildContexts(depth + 1);
          newNode = notFound();
        });
        currentScope = scope;
      } else {
        newNode = document.createComment('route:empty');
      }
    } else if (routeDef.lazy) {
      // Lazy-loaded route component
      const LazyComp = lazyComponent(routeDef.lazy, {
        fallback: (router as any)._options.lazyFallback,
      });
      const scope = createScope(() => {
        provideChildContexts(depth + 1);
        newNode = LazyComp({});
      });
      currentScope = scope;
    } else if (routeDef.component) {
      // Direct component
      const scope = createScope(() => {
        provideChildContexts(depth + 1);
        newNode = routeDef.component!();
      });
      currentScope = scope;
    } else {
      newNode = document.createComment('route:no-component');
    }

    // Swap in DOM
    if (currentNode.parentNode) {
      currentNode.parentNode.replaceChild(newNode!, currentNode);
    }
    currentNode = newNode!;
  });

  return currentNode;
}

// Re-export contexts for hooks
export { RouterContext, OutletContext };
