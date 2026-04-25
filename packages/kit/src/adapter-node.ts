/**
 * Production Node adapter for `@mikata/kit`.
 *
 * Unlike the dev middleware (which pulls the template fresh and asks
 * Vite to transform it per request), the adapter assumes a built app:
 *
 *   dist/client/index.html           — the outlet-marker template,
 *                                      ready-to-serve, asset URLs hashed.
 *   dist/client/assets/*             — hashed JS/CSS/images referenced
 *                                      from index.html.
 *   dist/server/entry-server.js      — user's server entry, `render()`
 *                                      exported, built in Vite SSR mode.
 *
 * Intended usage from a tiny bootstrapper:
 *
 *   import { createServer } from 'node:http';
 *   import * as path from 'node:path';
 *   import { fileURLToPath } from 'node:url';
 *   import { createRequestHandler } from '@mikata/kit/adapter-node';
 *   import * as serverEntry from './dist/server/entry-server.js';
 *
 *   const __dirname = path.dirname(fileURLToPath(import.meta.url));
 *   const handler = createRequestHandler({
 *     clientDir: path.join(__dirname, 'dist/client'),
 *     serverEntry,
 *   });
 *
 *   createServer(handler).listen(3000);
 */

import { promises as fs, createReadStream } from 'node:fs';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { spliceHead } from './splice-head';
import { dispatchApiRoute, type ApiRouteDefinition } from './api';
import { buildRequestUrl } from './request-url';

export interface AdapterRenderContext {
  url: string;
  req: IncomingMessage;
  /**
   * Pre-built Fetch `Request` mirroring the inbound `req`. Present only
   * for mutating methods (POST/PUT/PATCH/DELETE) — GET/HEAD leave it
   * undefined so the cheap path doesn't pay for body buffering. Pass it
   * straight through to `renderRoute({ request })` to run actions.
   */
  request?: Request;
  /**
   * Raw inbound `Cookie:` header value (or `null` when the request had
   * none). Forward to `renderRoute({ cookieHeader })` so loaders /
   * actions receive a cookie handle that reads against the same snapshot.
   */
  cookieHeader?: string | null;
}

export interface AdapterRenderResult {
  html: string;
  stateScript?: string;
  /** HTTP status the response should use. Defaults to 200. */
  status?: number;
  /** Extra response headers — for e.g. cache control. */
  headers?: Record<string, string>;
  /**
   * Serialised `<head>` tags to splice into the template. Empty string
   * is equivalent to omission.
   */
  headTags?: string;
  /**
   * When a matched action returned a Response with a `Location` header
   * (typically from `redirect()`), this carries the target URL + status.
   * The adapter responds with an HTTP redirect instead of rendering.
   */
  redirect?: { url: string; status: number };
  /**
   * Loader results keyed by route `fullPath`. The adapter echoes these
   * as part of the JSON reply to enhanced form submissions so the client
   * form handler can refresh `useLoaderData()` without a navigation.
   */
  loaderData?: Record<string, unknown>;
  /**
   * Action results keyed by route `fullPath`. Same shape as `loaderData`
   * — forwarded in the enhanced-submit JSON reply.
   */
  actionData?: Record<string, unknown>;
  /**
   * Serialized `Set-Cookie` header values queued during the render
   * (typically by a session-commit inside `action()`). Each entry is
   * emitted as its own `Set-Cookie` header — Node supports an array for
   * the Set-Cookie name and the adapter forwards it verbatim.
   */
  setCookies?: readonly string[];
}

export interface ServerEntry {
  render(ctx: AdapterRenderContext): Promise<AdapterRenderResult> | AdapterRenderResult;
  /**
   * Flat list of API-route definitions, typically re-exported from the
   * `virtual:mikata-routes` module that the kit plugin emits. When
   * present, the adapter tries API dispatch before SSR so URL patterns
   * like `/api/users/:id` resolve to the handler's `Response` without
   * touching the renderer. Optional — a server entry without API
   * routes just sets this to `undefined` (or omits it).
   */
  apiRoutes?: readonly ApiRouteDefinition[];
}

export interface CreateRequestHandlerOptions {
  /**
   * Absolute path to the built client directory. Must contain
   * `index.html` (with the outlet marker) and the hashed asset bundle
   * Vite emitted.
   */
  clientDir: string;
  /**
   * The user's server entry — typically imported from
   * `./dist/server/entry-server.js`. Must have a `render()` export.
   */
  serverEntry: ServerEntry;
  /**
   * HTML marker in `index.html` that gets replaced with the rendered
   * component tree + state script. Default: `<!--ssr-outlet-->`.
   */
  outletMarker?: string;
  /**
   * HTML marker replaced with the render's `headTags`. Default:
   * `<!--mikata-head-->`. When the template omits this marker the
   * handler falls back to inserting the tags immediately before
   * `</head>`.
   */
  headMarker?: string;
  /**
   * When `true`, read `x-forwarded-host` and `x-forwarded-proto` to
   * build `request.url`. Default: `false`. Only enable when a trusted
   * reverse proxy fronts this server and is guaranteed to overwrite
   * any client-supplied forwarded headers - otherwise a remote client
   * can poison `request.url`, which cascades into open redirects,
   * origin-check bypasses, and OAuth callback tampering.
   *
   * Without this flag, the handler reads `req.headers.host` and
   * infers the scheme from `req.socket.encrypted`. Falls back to
   * `localhost` only when no host header is present at all (curl
   * `--no-host`, synthetic test harnesses).
   */
  trustProxy?: boolean;
}

export type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void>;

// URLs that look like a hashed Vite asset (`.js`, `.css`, etc.) are
// served from disk directly rather than treated as page routes.
const ASSET_EXT_RE = /\.[a-z0-9]+(?:\?|$)/i;

const DEFAULT_OUTLET = '<!--ssr-outlet-->';
const DEFAULT_HEAD_MARKER = '<!--mikata-head-->';

/** Request header that marks a fetch-enhanced form submit — see `form.ts`. */
const FORM_SUBMIT_HEADER = 'x-mikata-form';

/**
 * Build a `(req, res) => Promise<void>` handler suitable for
 * `http.createServer()` or any Connect-style middleware host.
 */
export function createRequestHandler(
  options: CreateRequestHandlerOptions,
): RequestHandler {
  const outletMarker = options.outletMarker ?? DEFAULT_OUTLET;
  const headMarker = options.headMarker ?? DEFAULT_HEAD_MARKER;
  const trustProxy = options.trustProxy === true;
  const clientDir = path.resolve(options.clientDir);
  const indexHtmlPath = path.join(clientDir, 'index.html');

  // Read the built template once at first use and cache it. The index
  // file is immutable for the lifetime of a server process — rebuilding
  // means redeploying, which restarts the process anyway.
  let templatePromise: Promise<string> | null = null;
  const readTemplate = (): Promise<string> => {
    if (!templatePromise) {
      templatePromise = fs.readFile(indexHtmlPath, 'utf-8');
    }
    return templatePromise;
  };

  return async function mikataHandler(req, res) {
    const method = req.method ?? 'GET';
    const rawUrl = req.url ?? '/';
    const pathname = rawUrl.split('?')[0];

    // Prefer static assets first so hashed Vite bundles never race the
    // SSR path. Only valid for safe methods — a POST to a .js URL is
    // almost certainly a misrouted mutation that belongs in the render
    // path (where the 405 will come from the route not matching).
    if ((method === 'GET' || method === 'HEAD') && ASSET_EXT_RE.test(pathname)) {
      const served = await tryServeStatic(clientDir, pathname, res);
      if (served) return;
      // Fall through to SSR for e.g. `/users/foo.bar` if it happens to
      // look like an asset path but the file doesn't exist.
    }

    try {
      const apiRoutes = options.serverEntry.apiRoutes;
      const hasApi = !!(apiRoutes && apiRoutes.length > 0);

      // Build a fetch `Request` for methods that carry a body so route
      // actions can read `request.formData()` / `.json()` directly.
      // GET/HEAD normally skip this — the cost (buffering + Request
      // construction) isn't worth it on the hot read path. But when
      // API routes are registered we need a Request for every method
      // so `dispatchApiRoute()` can hand it to the verb handler.
      let request: Request | undefined;
      if (method !== 'GET' && method !== 'HEAD') {
        request = await buildFetchRequest(req, { trustProxy });
      } else if (hasApi) {
        request = await buildFetchRequest(req, { trustProxy });
      }

      // Try API dispatch first. A matching handler short-circuits the
      // SSR path entirely — its `Response` flows straight to the Node
      // socket. A `null` return means no API route matched the URL, so
      // we fall through to the page renderer as usual.
      if (hasApi && request) {
        const apiResponse = await dispatchApiRoute(
          rawUrl,
          method,
          apiRoutes!,
          request,
        );
        if (apiResponse) {
          await sendFetchResponse(res, apiResponse);
          return;
        }
      }

      const isEnhancedSubmit =
        request !== undefined && req.headers[FORM_SUBMIT_HEADER] !== undefined;

      // Don't pass a GET Request into the renderer — `renderRoute`
      // inspects `request.method` to decide whether to run actions, and
      // while it'd guard correctly, leaving `request` undefined on GET
      // keeps the SSR contract with the renderer unchanged and preserves
      // the cheap read path for page-route rendering.
      const renderRequest =
        method !== 'GET' && method !== 'HEAD' ? request : undefined;

      // Node coerces a missing cookie header to undefined; renderRoute
      // accepts `null` as "no cookie", so normalize here to keep both
      // sides honest.
      const rawCookieHeader = req.headers.cookie;
      const cookieHeader =
        typeof rawCookieHeader === 'string' ? rawCookieHeader : null;

      const rendered = await Promise.resolve(
        options.serverEntry.render({
          url: rawUrl,
          req,
          request: renderRequest,
          cookieHeader,
        }),
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

      // Flush any Set-Cookie headers the render queued. Node allows an
      // array for the Set-Cookie name and emits one header per entry,
      // which matches the RFC 6265 "multiple headers, one cookie per
      // header" shape. Runs before the three response paths below so
      // redirects, enhanced submits, and HTML all see the same cookies.
      if (setCookies && setCookies.length > 0) {
        res.setHeader('Set-Cookie', [...setCookies]);
      }

      // Redirect short-circuit: the action returned a Response with a
      // Location header. For a native (no-JS) submit respond with a real
      // HTTP redirect; for an enhanced submit reply with JSON so the
      // client-side form handler can call `router.navigate()` without
      // a full-page reload.
      if (redirect) {
        if (isEnhancedSubmit) {
          sendJson(res, redirect.status, { redirect, loaderData, actionData });
        } else {
          res.statusCode = redirect.status;
          res.setHeader('Location', redirect.url);
          if (headers) {
            for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
          }
          res.end();
        }
        return;
      }

      // Enhanced submits never want an HTML page back — the client is
      // going to merge the JSON into its stores in place.
      if (isEnhancedSubmit) {
        sendJson(res, status, { loaderData, actionData });
        return;
      }

      const template = await readTemplate();
      const withHead = spliceHead(template, headTags, headMarker);
      const full = withHead.replace(outletMarker, html + stateScript);

      res.statusCode = status;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (headers) {
        for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
      }
      res.end(full);
    } catch (err) {
      // Fail loudly to stderr so the deploy's log pipeline catches it;
      // respond with a terse 500 so we don't leak stack traces to users.
      // eslint-disable-next-line no-console
      console.error('[mikata/kit adapter] render failed:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Internal Server Error');
    }
  };
}

// ---------------------------------------------------------------------------
// IncomingMessage → fetch Request
// ---------------------------------------------------------------------------

/**
 * Buffer the request body and wrap it in a Fetch `Request` object.
 * We buffer (rather than stream) because route actions are written
 * against the Fetch API — `.formData()` / `.json()` expect a body that
 * can be read as a whole. The buffering is bounded by whatever the HTTP
 * server already accepted; no explicit cap is imposed here because real
 * deployments should front this with a reverse proxy that enforces one.
 */
async function buildFetchRequest(
  req: IncomingMessage,
  options: { trustProxy?: boolean } = {},
): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  // Build an absolute URL so `new Request()` accepts it. Forwarded
  // headers are honoured only with explicit opt-in; see
  // `resolveRequestOrigin` for the trust model.
  const url = buildRequestUrl(req, { trustProxy: options.trustProxy });

  // Mirror node headers into fetch Headers. Skip undefined and host
  // pseudo-headers; duplicate headers (set-cookie-ish) come through as
  // arrays and are joined with commas — Fetch Headers handles that for
  // us via `append`.
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
    // Node's undici Request requires `duplex: 'half'` when a body is
    // present on the request side — the 'half' value matches the
    // single-read-then-done pattern actions use.
    ...(body ? { duplex: 'half' } : {}),
  } as RequestInit);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

/**
 * Copy a Fetch `Response` into a Node `ServerResponse`. Status, headers
 * and body are all forwarded; a null body (e.g. 204/304/redirect) ends
 * the response empty. The body is read in one go rather than streamed —
 * API handlers typically produce modest JSON payloads, and buffering
 * avoids the complexity of pumping a web ReadableStream into a Node
 * Writable. If larger payloads become a concern later, swap this for
 * `Readable.fromWeb(response.body).pipe(res)`.
 */
async function sendFetchResponse(
  res: ServerResponse,
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

// ---------------------------------------------------------------------------
// static file serving
// ---------------------------------------------------------------------------

const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Stream a single file from `clientDir` if the request resolves to one.
 * Returns `true` when the response was handled, `false` when the file
 * wasn't found (so the caller can fall through to other handling).
 * Rejects path traversal by requiring the resolved path stay under
 * `clientDir`.
 */
async function tryServeStatic(
  clientDir: string,
  pathname: string,
  res: ServerResponse,
): Promise<boolean> {
  // Drop query string (some user agents include ?t= cache-busters on
  // module imports) and decode before joining. Malformed
  // percent-encoding in a static asset URL is a 404, not a 500 -
  // there's no file on disk that maps to a broken `%XX` anyway.
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname.split('?')[0]);
  } catch {
    return false;
  }
  // Strip the leading slash so `path.join` doesn't treat it as an
  // absolute path and escape `clientDir`.
  const rel = decoded.replace(/^\/+/, '');
  const abs = path.resolve(clientDir, rel);
  // Path-traversal guard — confirm the resolved file is still under
  // clientDir (plus the separator so `clientDir-other` can't match).
  const clientDirWithSep = clientDir.endsWith(path.sep)
    ? clientDir
    : clientDir + path.sep;
  if (abs !== clientDir && !abs.startsWith(clientDirWithSep)) {
    res.statusCode = 403;
    res.end();
    return true;
  }

  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;

  const ext = path.extname(abs).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', String(stat.size));
  // Vite's filenames include content hashes, so assets are effectively
  // immutable. Browsers will honour the cache for a year.
  if (/[.-][a-f0-9]{8,}\./i.test(path.basename(abs))) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(abs);
    stream.on('error', reject);
    stream.on('end', () => resolve());
    stream.pipe(res);
  });
  return true;
}
