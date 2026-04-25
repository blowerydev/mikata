import { renderRoute } from '@mikata/kit/server';
import * as manifest from 'virtual:mikata-routes';

// Pass the whole manifest namespace so `renderRoute` reads `notFound`
// and `base` from it directly. Mirrors the client entry's `mount(...)`
// call so url/base/notFound handling is symmetric across the two.
export async function render(ctx: {
  url: string;
  request?: Request;
  cookieHeader?: string | null;
}) {
  return renderRoute(manifest, {
    url: ctx.url,
    request: ctx.request,
    cookieHeader: ctx.cookieHeader,
  });
}

export const { routes, apiRoutes } = manifest;
