declare module 'virtual:mikata-routes' {
  import type { RouteDefinition } from '@mikata/router';
  import type { ApiRouteDefinition } from '@mikata/kit/api';
  const routes: readonly RouteDefinition[];
  export default routes;
  export { routes };
  export const notFound:
    | (() => Promise<{ default: (props: Record<string, unknown>) => Node | null }>)
    | undefined;
  export const apiRoutes: readonly ApiRouteDefinition[];
  // Pulled from Vite's resolved `base` config by the kit plugin so
  // `mount` / `renderRoute` can read it off the manifest namespace
  // instead of every entry doing `import.meta.env.BASE_URL.replace(...)`.
  export const base: string | undefined;
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
