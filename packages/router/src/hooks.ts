/**
 * Router hooks — convenience wrappers around inject(RouterContext).
 */

import { computed, onCleanup } from '@mikata/reactivity';
import { inject } from '@mikata/runtime';
import { RouterContext } from './outlet';
import type { Router, RouteGuard, MatchedRoute, ReadSignal } from './types';

/**
 * Get the router instance from context.
 * Must be called inside a component that is a descendant of provideRouter().
 */
export function useRouter(): Router {
  return inject(RouterContext).router;
}

/**
 * Get the current route params as a reactive signal.
 */
export function useParams<T extends Record<string, string> = Record<string, string>>(): ReadSignal<T> {
  const router = useRouter();
  return router.params as ReadSignal<T>;
}

/**
 * Get the current search params as a reactive signal and a setter.
 */
export function useSearchParams<T extends Record<string, unknown> = Record<string, unknown>>(): [
  ReadSignal<T>,
  Router['setSearchParams'],
] {
  const router = useRouter();
  return [router.searchParams as ReadSignal<T>, router.setSearchParams];
}

/**
 * Register a navigation guard scoped to the current component's lifetime.
 * Automatically removed when the component is disposed.
 *
 * Usage:
 *   function EditForm() {
 *     useGuard((to, from) => {
 *       if (isDirty()) return confirm('Leave?') ? true : false;
 *     });
 *   }
 */
export function useGuard(guard: RouteGuard): void {
  const { router } = inject(RouterContext);
  const guards = (router as any)._componentGuards as Set<RouteGuard>;
  guards.add(guard);
  onCleanup(() => guards.delete(guard));
}

/**
 * Check if a path matches the current route.
 * Returns a signal that is the matched route or null.
 *
 * Usage:
 *   const match = useMatch('/users/:id');
 *   effect(() => {
 *     if (match()) console.log('On user page');
 *   });
 */
export function useMatch(path: string | (() => string)): ReadSignal<boolean> {
  const router = useRouter();
  const getPath = typeof path === 'function' ? path : () => path;

  return computed(() => {
    const current = router.path();
    const target = getPath();

    // Simple match: exact or prefix
    return current === target || current.startsWith(target + '/');
  });
}
