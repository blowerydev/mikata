declare module 'virtual:mikata-routes' {
  import type { RouteDefinition } from '@mikata/router';
  const routes: readonly RouteDefinition[];
  export default routes;
  export { routes };
  export const notFound:
    | (() => Promise<{ default: (props: Record<string, unknown>) => unknown }>)
    | undefined;
}
