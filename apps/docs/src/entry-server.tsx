// Install the DOM shim before any route module is imported - Mikata
// compiles JSX to module-level `_template(...)` calls that touch
// `document` at load time. Needed for SSG (prerender imports route
// modules to read getStaticPaths); renderToString() re-installs its
// own shim per-render, so this doesn't conflict.
import { installShim } from '@mikata/server';
installShim();

import { renderRoute } from '@mikata/kit/server';
import routes, { notFound, apiRoutes } from 'virtual:mikata-routes';

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
  });
}

export { routes, apiRoutes };
