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

export interface RenderContext {
  url: string;
  req: Connect.IncomingMessage;
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
}

interface UserEntry {
  render(ctx: RenderContext): RenderResult | Promise<RenderResult>;
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
    if (!req.url || req.method !== 'GET') return next();
    // Accept: "*/*", "text/html" etc. — but an HMR ping or a JS import
    // comes through with application/javascript preferences; skip those.
    const accept = req.headers.accept ?? '';
    if (accept && !accept.includes('text/html') && !accept.includes('*/*')) {
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

      const template = await fs.readFile(indexHtmlPath, 'utf-8');
      const transformed = await server.transformIndexHtml(req.url, template);

      const mod = (await server.ssrLoadModule(entryAbs)) as Partial<UserEntry>;
      if (typeof mod.render !== 'function') {
        return next(
          new Error(
            `[mikata-kit] ${entryRel} must export a named \`render(context)\` function`,
          ),
        );
      }

      const { html, stateScript = '', status = 200, headTags = '' } = await mod.render({
        url: req.url,
        req,
      });

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

