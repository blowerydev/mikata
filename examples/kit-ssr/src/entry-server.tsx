import { renderRoute } from '@mikata/kit/server';
import * as manifest from 'virtual:mikata-routes';

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

// Re-exports:
//   - `routes` so @mikata/kit/prerender can walk the tree at build time.
//   - `apiRoutes` so the adapter + middleware dispatch API verbs before SSR.
export const { routes, apiRoutes } = manifest;
