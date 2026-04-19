import { renderRoute } from '@mikata/kit/server';
import routes, { notFound } from 'virtual:mikata-routes';

export async function render(ctx: { url: string }) {
  return renderRoute(routes, { url: ctx.url, notFound });
}
