import { mount } from '@mikata/kit/client';
import routes, { notFound } from 'virtual:mikata-routes';
import type { RouteDefinition } from '@mikata/router';
import '@mikata/ui/styles.css';
import { installThemeVars } from './theme-state';

installThemeVars();

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Resolve every lazy route to a concrete `component` before hydration.
 * Mikata's `lazy()` wrapper returns a placeholder node when the target
 * module is still unresolved - that placeholder is an orphan under the
 * hydration cursor, so the SSR tree ends up with no handlers attached.
 * Pre-awaiting the dynamic imports and handing the router a non-lazy
 * route tree means components render synchronously and adopt the
 * server-rendered DOM in place.
 */
type AnyComponent = (props: Record<string, unknown>) => Node | null;

async function resolveRoutes(
  defs: readonly RouteDefinition[],
): Promise<RouteDefinition[]> {
  return Promise.all(
    defs.map(async (def) => {
      const next: RouteDefinition = { ...def };
      if (def.lazy) {
        const mod = await def.lazy();
        next.component = (mod as { default: AnyComponent }).default;
        delete (next as { lazy?: unknown }).lazy;
      }
      if (def.children) {
        next.children = await resolveRoutes(def.children);
      }
      return next;
    }),
  );
}

// Pre-load the not-found module too, then wrap as a synchronous loader
// so `mount`'s lazy() sees `resolved` on its very first invocation.
async function preloadNotFound(): Promise<
  (() => Promise<{ default: AnyComponent }>) | undefined
> {
  if (!notFound) return undefined;
  const mod = (await notFound()) as { default: AnyComponent };
  return () => Promise.resolve(mod);
}

Promise.all([resolveRoutes(routes), preloadNotFound()]).then(
  ([resolvedRoutes, preloadedNotFound]) => {
    mount(resolvedRoutes, document.getElementById('root')!, {
      notFound: preloadedNotFound,
      base,
    });
  },
);
