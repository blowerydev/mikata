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
}

export interface ServerEntry {
  render(ctx: AdapterRenderContext): Promise<AdapterRenderResult> | AdapterRenderResult;
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
      // Build a fetch `Request` for methods that carry a body so route
      // actions can read `request.formData()` / `.json()` directly.
      // GET/HEAD skip this — the cost (buffering + Request construction)
      // isn't worth it on the hot read path.
      let request: Request | undefined;
      if (method !== 'GET' && method !== 'HEAD') {
        request = await buildFetchRequest(req);
      }

      const isEnhancedSubmit =
        request !== undefined && req.headers[FORM_SUBMIT_HEADER] !== undefined;

      const rendered = await Promise.resolve(
        options.serverEntry.render({ url: rawUrl, req, request }),
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
      } = rendered;

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
async function buildFetchRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  // Build an absolute URL so `new Request()` accepts it. The scheme /
  // host hint from the proxy headers is preferred; fall back to
  // synthetic defaults when none are set (keeps local curl calls working).
  const host = (req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost') as string;
  const proto = (req.headers['x-forwarded-proto'] ?? 'http') as string;
  const url = `${proto}://${host}${req.url ?? '/'}`;

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
  // module imports) and decode before joining.
  const decoded = decodeURIComponent(pathname.split('?')[0]);
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
