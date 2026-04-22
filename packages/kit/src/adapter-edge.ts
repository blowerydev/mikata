/**
 * Fetch / edge adapter for `@mikata/kit`.
 *
 * Returns a web-standard `(request: Request) => Promise<Response>` suitable
 * for Cloudflare Workers, Deno Deploy, Vercel Edge Functions, Netlify Edge
 * Functions, Bun.serve, and anywhere else a Fetch handler is the native
 * entry point. Paralleling `adapter-node`, but with no Node plumbing and
 * no disk IO — the built `index.html` is passed in as a string (bundle it
 * into your Worker / Function at build time) and static assets are the
 * platform's responsibility.
 *
 * Intended usage from a Worker (pseudo):
 *
 *   import { createFetchHandler } from '@mikata/kit/adapter-edge';
 *   import * as serverEntry from './dist/server/entry-server.js';
 *   import template from './dist/client/index.html?raw';
 *
 *   const handler = createFetchHandler({ template, serverEntry });
 *
 *   export default {
 *     async fetch(request, env) {
 *       // Let the asset binding handle hashed JS/CSS etc.
 *       const assetResp = await env.ASSETS.fetch(request);
 *       if (assetResp.status !== 404) return assetResp;
 *       return handler(request);
 *     },
 *   };
 *
 * The request shape is deliberately compatible with the entry that
 * `adapter-node` expects: `render({ url, request?, cookieHeader? })`.
 * A single built `entry-server.js` feeds both adapters.
 */

import { spliceHead } from './splice-head';
import { dispatchApiRoute, type ApiRouteDefinition } from './api';

export interface EdgeRenderContext {
  /** Full request URL pathname + search + hash (no origin). */
  url: string;
  /**
   * The inbound Fetch `Request`. Always present on the edge adapter —
   * unlike `adapter-node`, which omits this on GET/HEAD to skip body
   * buffering, we hand the original request through unchanged because
   * reads are lazy on Fetch Request objects and cost nothing until
   * `.formData()` / `.json()` is called.
   */
  request: Request;
  /**
   * Raw inbound `Cookie:` header value, or `null` when there is none.
   * Forward to `renderRoute({ cookieHeader })` so loaders / actions read
   * against the request snapshot.
   */
  cookieHeader: string | null;
}

export interface EdgeRenderResult {
  html: string;
  stateScript?: string;
  /** HTTP status. Defaults to 200. */
  status?: number;
  /** Extra response headers — for cache control etc. */
  headers?: Record<string, string>;
  /**
   * Serialised `<head>` tags to splice into the template. Empty string
   * is treated as omission.
   */
  headTags?: string;
  /**
   * Set by `renderRoute` when a matched action returned a Response with
   * a `Location` header. The adapter sends an HTTP redirect instead of
   * rendering HTML.
   */
  redirect?: { url: string; status: number };
  /** Loader results keyed by route `fullPath` — echoed on enhanced submits. */
  loaderData?: Record<string, unknown>;
  /** Action results keyed by route `fullPath` — echoed on enhanced submits. */
  actionData?: Record<string, unknown>;
  /**
   * Set-Cookie header values queued during the render. Each entry is
   * appended as its own `set-cookie` header on the outgoing Response so
   * the runtime emits them as separate HTTP headers (per RFC 6265).
   */
  setCookies?: readonly string[];
}

export interface EdgeServerEntry {
  render(
    ctx: EdgeRenderContext,
  ): Promise<EdgeRenderResult> | EdgeRenderResult;
  /**
   * Flat list of API-route definitions, typically re-exported from the
   * `virtual:mikata-routes` module. When present, the adapter tries API
   * dispatch before SSR so URL patterns like `/api/users/:id` resolve
   * to the handler's `Response` without touching the renderer.
   */
  apiRoutes?: readonly ApiRouteDefinition[];
}

export interface CreateFetchHandlerOptions {
  /**
   * Contents of the built `index.html`, with the outlet + head markers
   * still in place. On Cloudflare Workers / Vercel Edge / etc. the usual
   * pattern is to bundle the file at build time via an `?raw` import.
   * The handler splices the rendered HTML + head tags into this string.
   */
  template: string;
  /**
   * The user's server entry — typically imported as a module namespace
   * from the built `entry-server.js`. Must have a `render()` export.
   */
  serverEntry: EdgeServerEntry;
  /**
   * HTML marker in `template` that gets replaced with the rendered
   * component tree + state script. Default: `<!--ssr-outlet-->`.
   */
  outletMarker?: string;
  /**
   * HTML marker in `template` replaced with the render's `headTags`.
   * Default: `<!--mikata-head-->`. When the template omits this marker
   * the handler inserts the tags immediately before `</head>`.
   */
  headMarker?: string;
}

const DEFAULT_OUTLET = '<!--ssr-outlet-->';
const DEFAULT_HEAD_MARKER = '<!--mikata-head-->';

/** Request header that marks a fetch-enhanced form submit — see `form.ts`. */
const FORM_SUBMIT_HEADER = 'x-mikata-form';

/**
 * Build a `(request: Request) => Promise<Response>` handler.
 */
export function createFetchHandler(
  options: CreateFetchHandlerOptions,
): (request: Request) => Promise<Response> {
  const outletMarker = options.outletMarker ?? DEFAULT_OUTLET;
  const headMarker = options.headMarker ?? DEFAULT_HEAD_MARKER;
  const template = options.template;

  return async function mikataFetchHandler(request: Request): Promise<Response> {
    const method = request.method;
    // Strip origin from the URL — `renderRoute` matches against pathname
    // + search + hash only, and the router's memory history expects a
    // bare path. Workers and Deno both give absolute request.url values.
    const parsed = new URL(request.url);
    const url = parsed.pathname + parsed.search + parsed.hash;
    const cookieHeader = request.headers.get('cookie');

    try {
      const apiRoutes = options.serverEntry.apiRoutes;
      const hasApi = !!(apiRoutes && apiRoutes.length > 0);

      // Try API dispatch first. Matching handler short-circuits the SSR
      // path entirely; `null` means no API route matched the URL so we
      // fall through to page rendering.
      if (hasApi) {
        const apiResponse = await dispatchApiRoute(
          url,
          method,
          apiRoutes!,
          request,
        );
        if (apiResponse) return apiResponse;
      }

      const isEnhancedSubmit = request.headers.get(FORM_SUBMIT_HEADER) !== null;

      const rendered = await Promise.resolve(
        options.serverEntry.render({ url, request, cookieHeader }),
      );

      const {
        html,
        stateScript = '',
        status = 200,
        headers,
        headTags = '',
        redirect,
        loaderData,
        actionData,
        setCookies,
      } = rendered;

      // Redirect short-circuit. For a native submit respond with a real
      // HTTP redirect; for an enhanced submit reply with JSON so the
      // client-side form handler can call `router.navigate()` without a
      // full-page reload. Cookies queued during the render (typically a
      // session commit) ride along in both cases.
      if (redirect) {
        if (isEnhancedSubmit) {
          return jsonResponse(
            redirect.status,
            { redirect, loaderData, actionData },
            { headers, setCookies },
          );
        }
        const h = buildHeaders({ headers, setCookies });
        h.set('Location', redirect.url);
        return new Response(null, { status: redirect.status, headers: h });
      }

      // Enhanced submits never want HTML back — the client merges the
      // JSON into its stores in place.
      if (isEnhancedSubmit) {
        return jsonResponse(
          status,
          { loaderData, actionData },
          { headers, setCookies },
        );
      }

      const withHead = spliceHead(template, headTags, headMarker);
      const full = withHead.replace(outletMarker, html + stateScript);
      const h = buildHeaders({ headers, setCookies });
      h.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(full, { status, headers: h });
    } catch (err) {
      // Fail loudly to the platform's log pipeline; respond with a terse
      // 500 so we don't leak stack traces to users. Matches adapter-node.
      // eslint-disable-next-line no-console
      console.error('[mikata/kit adapter-edge] render failed:', err);
      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  };
}

function jsonResponse(
  status: number,
  body: unknown,
  extra: { headers?: Record<string, string>; setCookies?: readonly string[] },
): Response {
  const h = buildHeaders(extra);
  h.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: h });
}

/**
 * Build a Headers object from the optional map + Set-Cookie list. Each
 * `setCookies` entry is appended (not set) so the runtime emits them as
 * separate `Set-Cookie` headers — matching the RFC 6265 shape Node's
 * `res.setHeader('Set-Cookie', [...])` produces in `adapter-node`.
 */
function buildHeaders(opts: {
  headers?: Record<string, string>;
  setCookies?: readonly string[];
}): Headers {
  const h = new Headers();
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) h.set(k, v);
  }
  if (opts.setCookies && opts.setCookies.length > 0) {
    for (const cookie of opts.setCookies) h.append('set-cookie', cookie);
  }
  return h;
}
