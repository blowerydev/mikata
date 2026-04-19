import { renderRoute } from '@mikata/kit/server';
import routes, { notFound, apiRoutes } from 'virtual:mikata-routes';

export async function render(ctx: { url: string; request?: Request }) {
  return renderRoute(routes, {
    url: ctx.url,
    request: ctx.request,
    notFound,
  });
}

// Re-export so kit's adapter + middleware dispatch API verbs before SSR.
export { apiRoutes };
