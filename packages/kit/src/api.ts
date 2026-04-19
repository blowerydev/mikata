/**
 * API routes for `@mikata/kit`.
 *
 * A route file that exports at least one of `GET / POST / PUT / PATCH /
 * DELETE` and has no `default` export is an API route. The adapter and
 * dev middleware dispatch matching requests to the appropriate verb
 * handler before falling through to page rendering, so API routes and
 * page routes share the same URL namespace cleanly:
 *
 *   // routes/api/users/[id].ts
 *   import type { ApiContext } from '@mikata/kit/api';
 *
 *   export async function GET({ params }: ApiContext): Promise<Response> {
 *     const user = await db.users.find(params.id);
 *     return Response.json(user);
 *   }
 *
 *   export async function DELETE({ params }: ApiContext): Promise<Response> {
 *     await db.users.remove(params.id);
 *     return new Response(null, { status: 204 });
 *   }
 *
 * At build time the kit plugin classifies the file (by absence of
 * `export default`) and adds it to the virtual manifest's `apiRoutes`
 * list, which the adapter feeds into `dispatchApiRoute()`.
 */

export interface ApiContext {
  /** The inbound `Request`. Use `.json()` / `.formData()` / `.text()` etc. */
  request: Request;
  /** Path params for the matched route. */
  params: Record<string, string>;
  /** Full request URL (pathname + search + hash). */
  url: string;
}

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export type ApiHandler = (
  ctx: ApiContext,
) => Response | Promise<Response>;

/**
 * Shape a route module must have to participate in API dispatch. Each
 * verb export is independently optional — a module can expose just `GET`
 * (a read-only endpoint) or any combination.
 */
export interface ApiModule {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  PATCH?: ApiHandler;
  DELETE?: ApiHandler;
  HEAD?: ApiHandler;
  OPTIONS?: ApiHandler;
}

/**
 * One entry in the `apiRoutes` list the kit plugin emits. Paths use the
 * same `:param` / `*` syntax as page routes so the URL surface matches
 * `@mikata/router`'s.
 */
export interface ApiRouteDefinition {
  /** URL pattern (e.g. `/api/users/:id`). */
  path: string;
  /** Lazy module loader — resolved on first dispatch, cached thereafter. */
  lazy: () => Promise<ApiModule>;
}

/**
 * Try every API route in order until one matches `url`. Returns a
 * `Response` when a handler ran (including 405 for a wrong-verb match
 * on an otherwise matching path). Returns `null` when no route matched
 * at all — the caller should fall through to page rendering.
 *
 * A matching path with no verb handler for the request method yields a
 * 405 with an `Allow` header listing the methods the module actually
 * exports. That mirrors how a plain HTTP server would behave and keeps
 * the client from silently getting a 404 for a real but mis-addressed
 * endpoint.
 */
export async function dispatchApiRoute(
  url: string,
  method: string,
  apiRoutes: readonly ApiRouteDefinition[],
  request: Request,
): Promise<Response | null> {
  const pathname = extractPathname(url);
  const upper = method.toUpperCase() as HttpMethod;

  for (const route of apiRoutes) {
    const compiled = compilePath(route.path);
    const m = compiled.regex.exec(pathname);
    if (!m) continue;

    const params: Record<string, string> = {};
    for (let i = 0; i < compiled.paramNames.length; i++) {
      params[compiled.paramNames[i]!] = decodeURIComponent(m[i + 1]!);
    }

    const mod = await route.lazy();
    const handler = mod[upper];
    if (!handler) {
      const allow = listVerbs(mod);
      const headers: Record<string, string> = {};
      if (allow.length > 0) headers['Allow'] = allow.join(', ');
      return new Response(null, { status: 405, headers });
    }

    // Let handler errors surface as 500s — the adapter's try/catch wraps
    // us and will log + send a terse 500 body. That matches how loader
    // and action throws behave for page routes.
    return await handler({ request, params, url });
  }

  return null;
}

// ---------------------------------------------------------------------------
// internal: path compilation
// ---------------------------------------------------------------------------

/**
 * Compile a kit path pattern to a regex + captured-param names. Mirrors
 * `@mikata/router`'s matcher (`:param` captures a single segment, `*`
 * captures the rest) but kept local so API dispatch stays independent
 * of the page router.
 */
function compilePath(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const parts = path.split('/').filter(Boolean);

  let pattern = '^';
  for (const part of parts) {
    if (part === '*' || part === '**') {
      paramNames.push('*');
      pattern += '/(.+)';
    } else if (part.startsWith(':')) {
      paramNames.push(part.slice(1));
      pattern += '/([^/]+)';
    } else {
      pattern += '/' + escapeRegex(part);
    }
  }
  if (pattern === '^') pattern = '^/';
  pattern += '/?$';

  return { regex: new RegExp(pattern), paramNames };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractPathname(url: string): string {
  if (url.startsWith('/')) {
    const qIdx = url.indexOf('?');
    return qIdx >= 0 ? url.slice(0, qIdx) : url;
  }
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

const ALL_VERBS: readonly HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

function listVerbs(mod: ApiModule): HttpMethod[] {
  return ALL_VERBS.filter((v) => typeof mod[v] === 'function');
}
