declare module 'virtual:mikata-routes' {
  import type { RouteDefinition } from '@mikata/router';
  import type { ApiRouteDefinition } from '@mikata/kit/api';
  const routes: readonly RouteDefinition[];
  export default routes;
  export { routes };
  export const notFound:
    | (() => Promise<{ default: (props: Record<string, unknown>) => unknown }>)
    | undefined;
  export const apiRoutes: readonly ApiRouteDefinition[];
}

declare module 'virtual:mikata-nav' {
  import type { NavEntry } from '@mikata/kit';
  // Emitted entries always carry a resolved `path` (single-route nav
  // gets it from the manifest, dynamic-route nav must supply its own).
  type ResolvedNavEntry = NavEntry & { path: string };
  const nav: readonly ResolvedNavEntry[];
  export default nav;
  export { nav };
}
