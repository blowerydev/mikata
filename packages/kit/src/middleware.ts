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
  const indexHtmlPath = path.resolve(options.projectRoot, 'index.html');

  return async function mikataSsrMiddleware(req, res, next) {
    if (!req.url) return next();
    const method = req.method ?? 'GET';
    // HEAD isn't interesting for SSR — let Vite's later middleware
    // return the expected metadata. GET serves pages; POST/PUT/PATCH/
    // DELETE drive action flows.
    if (method === 'HEAD') return next();
    const isMutation = method !== 'GET';
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
        return next(
          new Error(
            `[mikata-kit] server entry not found. Looked for ${entryRel}${ENTRY_EXTENSIONS.join('|')} under ${options.projectRoot}`,
          ),
        );
      }

      const mod = (await server.ssrLoadModule(entryAbs)) as Partial<UserEntry>;
      if (typeof mod.render !== 'function') {
        return next(
          new Error(
            `[mikata-kit] ${entryRel} must export a named \`render(context)\` function`,
          ),
        );
      }

      const apiRoutes = mod.apiRoutes;
      const hasApi = !!(apiRoutes && apiRoutes.length > 0);

      // Buffer body + build a Request for mutating methods. GET stays on
      // the cheap read path — unless there are API routes registered,
      // in which case we need a Request for every method so
      // `dispatchApiRoute()` can hand it to the verb handler.
      const request = isMutation
        ? await buildFetchRequest(req)
        : hasApi
          ? await buildFetchRequest(req)
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
      // Let Vite rewrite the stack so source maps point at the user's
      // original file, not the bundled SSR output.
      if (err instanceof Error) server.ssrFixStacktrace(err);
      next(err);
    }
  };
}

/**
 * Buffer a Node `IncomingMessage` body and wrap it in a Fetch `Request`.
 * Matches the adapter-node helper — dev and prod must give actions the
 * same `request` shape so `request.formData()` works in both modes.
 */
async function buildFetchRequest(req: Connect.IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  const host = (req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost') as string;
  const proto = (req.headers['x-forwarded-proto'] ?? 'http') as string;
  const url = `${proto}://${host}${req.url ?? '/'}`;

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

