/**
 * Test-only router helpers.
 *
 * `createTestRouter` builds a router backed by in-memory history so unit tests
 * don't have to touch `window.location` or stitch `createRouter` together with
 * `history: 'memory'` every time.
 */

import { createRouter } from './router';
import { createMemoryHistory } from './history';
import type { RouteDefinition, Router, RouterOptions } from './types';

export interface TestRouterOptions extends Omit<RouterOptions, 'history' | 'routes'> {
  /** Path to start at. Defaults to `/`. */
  initialPath?: string;
}

/**
 * Create a router preconfigured with in-memory history for tests.
 *
 *   const router = createTestRouter([{ path: '/', component: Home }], '/');
 *   await router.navigate('/about');
 */
export function createTestRouter(
  routes: RouteDefinition[],
  initialPathOrOptions: string | TestRouterOptions = '/',
): Router {
  const opts: TestRouterOptions =
    typeof initialPathOrOptions === 'string'
      ? { initialPath: initialPathOrOptions }
      : initialPathOrOptions;
  const { initialPath = '/', ...rest } = opts;

  return createRouter({
    ...rest,
    routes,
    history: createMemoryHistory(initialPath),
  });
}
