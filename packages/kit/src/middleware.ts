/**
 * Dev-mode SSR middleware for `@mikata/kit`.
 *
 * Wires a tiny Connect-style middleware into Vite's dev server so each
 * page request is rendered to HTML on the server:
 *
 *   1. Read `index.html` from the project root.
 *   2. Ask Vite to transform it (injects the HMR client, preamble, etc.).
 *   3. Load the user's server entry through `server.ssrLoadModule()` so
 *      edits to the entry (and anything it imports) hot-reload without a
 *      dev-server restart.
 *   4. Call its `render()` export, splice the result into the template
 *      (at `<!--ssr-outlet-->`) followed by the hydration state script,
 *      and flush.
 *
 * Production builds are out of scope for the plugin — users wire their
 * own Node/Worker entry against `@mikata/kit/server` directly.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { Connect, ViteDevServer } from 'vite';
import { spliceHead } from './splice-head';
import { dispatchApiRoute, type ApiRouteDefinition } from './api';
import { buildRequestUrl } from './request-url';

export interface SsrMiddlewareOptions {
  /** Project root (usually `config.root`). */
  projectRoot: string;
  /**
   * Path — relative to `projectRoot`, without extension — of the user's
   * server entry. Resolver tries `.tsx`, `.ts`, `.jsx`, `.js` in that
   * order. Default: `src/entry-server`.
   */
  entry?: string;
  /** HTML marker replaced with the rendered component tree. */
  outletMarker?: string;
  /**
   * HTML marker replaced with the serialised `<head>` tags. Default:
   * `<!--mikata-head-->`. When the template omits this marker the
   * middleware falls back to inserting the tags immediately before the
   * closing `</head>` tag.
   */
  headMarker?: string;
  /**
   * When `true`, read `x-forwarded-host` and `x-forwarded-proto` from
   * the dev request to build `request.url`. Default: `false`. See
   * `request-url.ts` for the trust model and the production handler
   * for the equivalent option in deployed mode. Dev rarely sees real
   * forwarded headers, but the same untrusted-by-default rule applies
   * so dev tests don't lull anyone into shipping the unsafe shape.
   */
  trustProxy?: boolean;
}

const DEFAULT_ENTRY = 'src/entry-server';
const ENTRY_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'] as const;
const DEFAULT_OUTLET = '<!--ssr-outlet-->';
const DEFAULT_HEAD_MARKER = '<!--mikata-head-->';

// URLs that look like a static asset get skipped — Vite's static-file
// middleware handles those, and we don't want to render HTML for a CSS
// request. `?` lets query strings come along for the ride.
const ASSET_EXT_RE = /\.[a-z0-9]+(?:\?|$)/i;

/** Request header that marks a fetch-enhanced form submit — see `form.ts`. */
const FORM_SUBMIT_HEADER = 'x-mikata-form';

export interface RenderContext {
  url: string;
  req: Connect.IncomingMessage;
  /**
   * Pre-built Fetch `Request` mirroring `req`. Present only for mutating
   * methods (POST/PUT/PATCH/DELETE). Forward it to
   * `renderRoute({ request })` so route actions can read the body.
   */
  request?: Request;
  /**
   * Raw inbound `Cookie:` header value, or `null` when there is none.
   * Forward to `renderRoute({ cookieHeader })` so loaders / actions see
   * the same snapshot the request arrived with.
   */
  cookieHeader?: string | null;
}

export interface RenderResult {
  html: string;
  stateScript?: string;
  /** HTTP status — defaults to 200 if the user entry omits it. */
  status?: number;
  /**
   * Serialised `<head>` tags to splice into the template. Empty string
   * is treated the same as omission.
   */
  headTags?: string;
  /**
   * Populated when a matched action returned a Response with a
   * `Location` header. Middleware responds with an HTTP redirect
   * instead of rendering the HTML.
   */
  redirect?: { url: string; status: number };
  /** Loader results keyed by route `fullPath` — echoed on enhanced submits. */
  loaderData?: Record<string, unknown>;
  /** Action results keyed by route `fullPath` — echoed on enhanced submits. */
  actionData?: Record<string, unknown>;
  /**
   * Set-Cookie header values queued by the render (typically a session
   * commit inside an action). Each entry is flushed as a separate
   * Set-Cookie header on the response.
   */
  setCookies?: readonly string[];
}

interface UserEntry {
  render(ctx: RenderContext): RenderResult | Promise<RenderResult>;
  /**
   * Optional flat list of API routes, typically re-exported from the
   * `virtual:mikata-routes` module. When present, the middleware tries
   * API dispatch before SSR rendering.
   */
  apiRoutes?: readonly ApiRouteDefinition[];
}

export function createSsrMiddleware(
  server: ViteDevServer,
  options: SsrMiddlewareOptions,
): Connect.NextHandleFunction {
  const entryRel = options.entry ?? DEFAULT_ENTRY;
  const outletMarker = options.outletMarker ?? DEFAULT_OUTLET;
  const headMarker = options.headMarker ?? DEFAULT_HEAD_MARKER;
  const trustProxy = options.trustProxy === true;
  const indexHtmlPath = path.resolve(options.projectRoot, 'index.html');

  return async function mikataSsrMiddleware(req, res, next) {
    if (!req.url) return next();
    const method = req.method ?? 'GET';
    const isHead = method === 'HEAD';
    // Treat HEAD like GET for read-side request shape, but bypass page
    // SSR (HEAD responses MUST NOT carry a body). HEAD still flows
    // through API dispatch below so registered HEAD handlers - and
    // health checks against them - work in dev the same way they do
    // in production.
    const isMutation = method !== 'GET' && !isHead;
    // Accept: "*/*", "text/html" etc. — but an HMR ping or a JS import
    // comes through with application/javascript preferences; skip those.
    // Form submits set Accept: application/json — let those through too.
    const accept = req.headers.accept ?? '';
    if (
      accept &&
      !accept.includes('text/html') &&
      !accept.includes('*/*') &&
      !accept.includes('application/json')
    ) {
      return next();
    }
    if (ASSET_EXT_RE.test(req.url)) return next();

    try {
      const entryAbs = await resolveEntry(options.projectRoot, entryRel);
      if (!entryAbs) {
        throw new Error(
          `[mikata-kit] server entry not found. Looked for ${entryRel}${ENTRY_EXTENSIONS.join('|')} under ${options.projectRoot}`,
        );
      }

      const mod = (await server.ssrLoadModule(entryAbs)) as Partial<UserEntry>;
      if (typeof mod.render !== 'function') {
        throw new Error(
          `[mikata-kit] ${entryRel} must export a named \`render(context)\` function`,
        );
      }

      const apiRoutes = mod.apiRoutes;
      const hasApi = !!(apiRoutes && apiRoutes.length > 0);

      // Buffer body + build a Request for mutating methods. GET stays on
      // the cheap read path — unless there are API routes registered,
      // in which case we need a Request for every method so
      // `dispatchApiRoute()` can hand it to the verb handler.
      const request = isMutation
        ? await buildFetchRequest(req, { trustProxy })
        : hasApi
          ? await buildFetchRequest(req, { trustProxy })
          : undefined;

      // API dispatch before SSR — a matching handler's `Response` is
      // forwarded to the Node socket and we're done. `null` means no
      // API route matched so we fall through to page rendering.
      if (hasApi && request) {
        const apiResponse = await dispatchApiRoute(
          req.url,
          method,
          apiRoutes!,
          request,
        );
        if (apiResponse) {
          await sendFetchResponse(res, apiResponse);
          return;
        }
      }

      // HEAD doesn't get an SSR body (HEAD responses must be empty per
      // RFC 7231). If no API route matched, hand back to Vite so static
      // assets and HMR endpoints still respond correctly.
      if (isHead) return next();

      const isEnhancedSubmit =
        request !== undefined && req.headers[FORM_SUBMIT_HEADER] !== undefined;

      const rawCookieHeader = req.headers.cookie;
      const cookieHeader =
        typeof rawCookieHeader === 'string' ? rawCookieHeader : null;

      const rendered = await mod.render({
        url: req.url,
        req,
        request: isMutation ? request : undefined,
        cookieHeader,
      });
      const {
        html,
        stateScript = '',
        status = 200,
        headTags = '',
        redirect,
        loaderData,
        actionData,
        setCookies,
      } = rendered;

      // Flush cookies before any of the three response paths so
      // redirects, enhanced submits, and HTML responses all carry them.
      if (setCookies && setCookies.length > 0) {
        res.setHeader('Set-Cookie', [...setCookies]);
      }

      // Redirect short-circuit (see adapter-node.ts for the full rationale).
      if (redirect) {
        if (isEnhancedSubmit) {
          sendJson(res, redirect.status, { redirect, loaderData, actionData });
        } else {
          res.statusCode = redirect.status;
          res.setHeader('Location', redirect.url);
          res.end();
        }
        return;
      }

      if (isEnhancedSubmit) {
        sendJson(res, status, { loaderData, actionData });
        return;
      }

      const template = await fs.readFile(indexHtmlPath, 'utf-8');
      const transformed = await server.transformIndexHtml(req.url, template);
      const withHead = spliceHead(transformed, headTags, headMarker);
      const full = withHead.replace(outletMarker, html + stateScript);
      res.statusCode = status;
      res.setHeader('Content-Type', 'text/html');
      res.end(full);
    } catch (err) {
      if (!(err instanceof Error)) {
        return next(err);
      }
      // Rewrite the stack through the Vite SSR source map so frames point
      // at the user's original file, not the bundled SSR output.
      server.ssrFixStacktrace(err);

      // Surface to Vite's built-in HMR overlay. When the page already has
      // an HMR client connected (the common dev loop - user was on a page
      // and triggered a request), the overlay appears on that current
      // page immediately. For a fresh load that hits the error directly,
      // the 500 HTML response below is the visible fallback.
      try {
        server.ws.send({
          type: 'error',
          err: {
            message: err.message,
            stack: err.stack ?? '',
          },
        });
      } catch {
        // `server.ws` may be unavailable (server closing, some test
        // harnesses). Swallow - the HTML response still carries the
        // full error text.
      }

      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(renderErrorPage(err));
    }
  };
}

/**
 * Dev-only 500 page. Embeds `/@vite/client` so the HMR overlay surfaces
 * if/when it connects, and inlines the error text as a readable fallback.
 * Prod adapters render a plain response and let the user's ErrorBoundary
 * handle rendering.
 */
function renderErrorPage(err: Error): string {
  const message = escapeHtml(err.message || 'SSR error');
  const stack = escapeHtml(err.stack ?? '');
  return (
    '<!doctype html><html><head>' +
    '<meta charset="utf-8">' +
    '<title>SSR Error - Mikata Kit</title>' +
    '<script type="module" src="/@vite/client"></script>' +
    '<style>' +
    'body{font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
    'background:#1a1a1a;color:#fff;margin:0;padding:24px}' +
    'h1{color:#e5484d;margin:0 0 16px;font-size:18px;font-weight:600}' +
    'pre{white-space:pre-wrap;word-break:break-word;margin:0;opacity:.85}' +
    '</style>' +
    '</head><body>' +
    `<h1>${message}</h1>` +
    `<pre>${stack}</pre>` +
    '</body></html>'
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Buffer a Node `IncomingMessage` body and wrap it in a Fetch `Request`.
 * Matches the adapter-node helper — dev and prod must give actions the
 * same `request` shape so `request.formData()` works in both modes.
 */
async function buildFetchRequest(
  req: Connect.IncomingMessage,
  options: { trustProxy?: boolean } = {},
): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  // Use the shared origin-resolution helper. Forwarded headers are
  // ignored unless `trustProxy` is set; see `request-url.ts`.
  const url = buildRequestUrl(req, { trustProxy: options.trustProxy });

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(name, v);
    } else {
      headers.set(name, value);
    }
  }

  return new Request(url, {
    method: req.method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
    ...(body ? { duplex: 'half' } : {}),
  } as RequestInit);
}

function sendJson(res: import('node:http').ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

/**
 * Forward a Fetch `Response` to the Node socket, mirroring the prod
 * adapter so API handlers behave identically in dev and in production.
 */
async function sendFetchResponse(
  res: import('node:http').ServerResponse,
  response: Response,
): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  if (response.body === null) {
    res.end();
    return;
  }
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

async function resolveEntry(
  root: string,
  relNoExt: string,
): Promise<string | null> {
  for (const ext of ENTRY_EXTENSIONS) {
    const abs = path.resolve(root, relNoExt + ext);
    try {
      await fs.access(abs);
      return abs;
    } catch {
      // try next extension
    }
  }
  return null;
}

