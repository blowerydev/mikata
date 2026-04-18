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
 */

import { hydrate, render } from '@mikata/runtime';
import {
  createRouter,
  provideRouter,
  routeOutlet,
  type RouteDefinition,
  type Router,
  type RouterOptions,
} from '@mikata/router';

export interface MountOptions extends Omit<RouterOptions, 'routes'> {
  /**
   * Skip hydration and do a full client render instead. Useful when the
   * container has no pre-rendered content (e.g. plain SPA dev mode).
   * Default: auto-detect by looking for a child node in `container`.
   */
  hydrate?: boolean;
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
  const { hydrate: shouldHydrate, ...routerOptions } = options;
  const router = createRouter({ routes: [...routes], ...routerOptions });

  function App() {
    provideRouter(router);
    return routeOutlet();
  }

  const wantsHydrate = shouldHydrate ?? container.firstChild !== null;
  const dispose = wantsHydrate
    ? hydrate(App, container)
    : render(App, container);

  return { router, dispose };
}
