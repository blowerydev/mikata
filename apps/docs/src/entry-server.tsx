import { renderRoute } from '@mikata/kit/server';
import routes, { notFound, apiRoutes } from 'virtual:mikata-routes';

// Match the client's base so Link hrefs rendered during SSR already
// point at /mikata/... paths. Vite defines `BASE_URL` on both client
// and server builds from the top-level `base` config.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export async function render(ctx: {
  url: string;
  request?: Request;
  cookieHeader?: string | null;
}) {
  return renderRoute(routes, {
    url: ctx.url,
    request: ctx.request,
    cookieHeader: ctx.cookieHeader,
    notFound,
    base,
  });
}

export { routes, apiRoutes };
