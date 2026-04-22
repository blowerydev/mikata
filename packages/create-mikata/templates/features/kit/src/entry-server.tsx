import { renderRoute } from '@mikata/kit/server';
import routes, { notFound, apiRoutes } from 'virtual:mikata-routes';

export async function render(ctx: {
  url: string;
  request?: Request;
  cookieHeader?: string | null;
}) {
  return renderRoute(routes, { ...ctx, notFound });
}

// `routes` is re-exported so `@mikata/kit/prerender` (SSG) can walk the
// tree at build time; `apiRoutes` so the adapter dispatches API verbs
// before the renderer sees the request.
export { routes, apiRoutes };
