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
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.end();
      return;
    }

    const rawUrl = req.url ?? '/';
    const pathname = rawUrl.split('?')[0];

    // Prefer static assets first so hashed Vite bundles never race the
    // SSR path. Anything without a recognisable extension falls through
    // to the renderer.
    if (ASSET_EXT_RE.test(pathname)) {
      const served = await tryServeStatic(clientDir, pathname, res);
      if (served) return;
      // Fall through to SSR for e.g. `/users/foo.bar` if it happens to
      // look like an asset path but the file doesn't exist.
    }

    try {
      const [template, rendered] = await Promise.all([
        readTemplate(),
        Promise.resolve(
          options.serverEntry.render({ url: rawUrl, req }),
        ),
      ]);
      const { html, stateScript = '', status = 200, headers, headTags = '' } = rendered;
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
