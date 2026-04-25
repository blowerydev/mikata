/**
 * Build the absolute origin (`scheme://host`) for an incoming Node
 * request, with explicit trust semantics for proxy-set headers.
 *
 * The default is paranoid: read `req.headers.host` and infer the
 * scheme from `req.socket.encrypted`. `x-forwarded-host` and
 * `x-forwarded-proto` are attacker-controlled in any deployment that
 * doesn't have a known reverse proxy in front of it; trusting them
 * unconditionally lets a remote client poison `request.url`, which
 * cascades into open redirects, broken origin checks, OAuth callback
 * tampering, and host-header attacks against any downstream code that
 * compares URLs to a configured origin.
 *
 * Apps deployed behind a trusted proxy (Caddy, Nginx, Cloudflare,
 * Fly.io, etc., where the proxy strips client-supplied
 * `x-forwarded-*` and replaces them with its own values) opt in via
 * `trustProxy: true`. There's no half-measure for "trust some
 * proxies": if you can't guarantee the proxy rewrites the headers,
 * leave the option off.
 */

import type { IncomingMessage } from 'node:http';
import type { TLSSocket } from 'node:tls';

export interface OriginResolutionOptions {
  /**
   * Read `x-forwarded-host` / `x-forwarded-proto` when set. Default:
   * `false`. Only enable when a trusted proxy fronts the app and is
   * guaranteed to overwrite client-supplied forwarded headers.
   */
  trustProxy?: boolean;
}

/**
 * Pick a single header value, taking the first when the proxy emitted
 * a comma-separated list (`x-forwarded-host: a,b,c` → `a`).
 */
function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;
  const first = raw.split(',')[0]?.trim();
  return first || undefined;
}

function isTlsSocket(req: IncomingMessage): boolean {
  const sock = req.socket as TLSSocket | undefined;
  return Boolean(sock && (sock as { encrypted?: boolean }).encrypted);
}

/**
 * Resolve `{ scheme, host }` from a Node request. The result combined
 * forms the origin used to build a Fetch `Request` URL.
 */
export function resolveRequestOrigin(
  req: IncomingMessage,
  options: OriginResolutionOptions = {},
): { scheme: string; host: string } {
  const trust = options.trustProxy === true;

  let host: string | undefined;
  let scheme: string | undefined;

  if (trust) {
    host = firstHeaderValue(req.headers['x-forwarded-host']);
    scheme = firstHeaderValue(req.headers['x-forwarded-proto']);
  }

  host ??= firstHeaderValue(req.headers.host);
  scheme ??= isTlsSocket(req) ? 'https' : 'http';

  // `localhost` keeps `new Request()` happy when neither header is
  // present (curl with `--no-host` style edge cases, custom test
  // harnesses). It's a synthetic last resort, not a security boundary.
  return { scheme, host: host ?? 'localhost' };
}

/**
 * Build the absolute URL string used to construct a Fetch `Request`.
 * Concatenates `resolveRequestOrigin()` with the request's path.
 */
export function buildRequestUrl(
  req: IncomingMessage,
  options: OriginResolutionOptions = {},
): string {
  const { scheme, host } = resolveRequestOrigin(req, options);
  return `${scheme}://${host}${req.url ?? '/'}`;
}
