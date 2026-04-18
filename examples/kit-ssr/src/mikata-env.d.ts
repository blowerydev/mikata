declare module 'virtual:mikata-routes' {
  import type { RouteDefinition } from '@mikata/router';
  const routes: readonly RouteDefinition[];
  export default routes;
  export { routes };
}
