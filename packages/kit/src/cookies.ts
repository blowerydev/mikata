/**
 * Cookie parsing + serialization + a mutable per-request handle.
 *
 * The primitives intentionally stay framework-agnostic — `parseCookieHeader`
 * and `serializeCookie` work on plain strings and can be used outside
 * kit. `createCookies()` wraps them into a `Cookies` object that
 * loaders, actions, and API handlers share for the lifetime of a single
 * request: reads see the inbound `Cookie` header, writes queue outgoing
 * `Set-Cookie` values that the adapter flushes on the response.
 *
 * Usage inside a route:
 *
 *   export async function action({ cookies }: ActionContext) {
 *     cookies.set('flash', 'Saved!', { path: '/', maxAge: 60 });
 *     return redirect('/');
 *   }
 *
 *   export async function load({ cookies }: LoadContext) {
 *     return { flash: cookies.get('flash') };
 *   }
 */

export interface CookieOptions {
  domain?: string;
  path?: string;
  /** Seconds until expiry. Prefer this over `expires`. */
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Parse a `Cookie:` header into a name→value map. Returns an empty
 * object for null / empty input. Later occurrences of the same name
 * win, matching browsers' last-write semantics when a value is set
 * repeatedly via JS or multiple Set-Cookie headers.
 */
export function parseCookieHeader(
  header: string | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const name = trimmed.slice(0, eq).trim();
    if (!name) continue;
    let value = trimmed.slice(eq + 1).trim();
    // Values may be double-quoted; strip the wrapping quotes without
    // touching quotes that aren't at both ends.
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

/**
 * Produce a `Set-Cookie` header value. The name is written verbatim
 * (cookies with names outside the token grammar are the caller's
 * problem); the value is percent-encoded so embedded `;`, `,`, or
 * spaces don't break the serialization.
 *
 * Setting `maxAge: 0` is the canonical way to delete a cookie — the
 * browser will expire it immediately, and the same codepath backs
 * `Cookies#delete`.
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) {
    const value = capitalise(options.sameSite);
    parts.push(`SameSite=${value}`);
  }
  return parts.join('; ');
}

/**
 * Per-request cookie handle. `get` reads the snapshot parsed from the
 * inbound Cookie header — writes via `set` / `delete` do NOT update
 * that snapshot, so a loader that sets a cookie and then reads it back
 * will see the old value. Make that explicit: reads are of the request,
 * writes are for the response.
 */
export interface Cookies {
  get(name: string): string | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  /**
   * Remove a cookie client-side. Emits a Set-Cookie with Max-Age=0 so
   * the browser expires it at the given path/domain. Cookies scoped to
   * a non-default path must be deleted with the same path attribute;
   * otherwise the browser keeps a second copy.
   */
  delete(
    name: string,
    options?: Omit<CookieOptions, 'maxAge' | 'expires'>,
  ): void;
  /** Snapshot of queued Set-Cookie header values, in insertion order. */
  outgoing(): readonly string[];
}

/**
 * Build a Cookies handle. Pass the inbound `Cookie` header so `get()`
 * can answer against the request; pass `null` / `undefined` when there
 * is no inbound header (first-time visitor, server-to-server call, etc.).
 */
export function createCookies(incomingHeader?: string | null): Cookies {
  const incoming = parseCookieHeader(incomingHeader);
  const queued: string[] = [];
  return {
    get(name) {
      return incoming[name];
    },
    set(name, value, options) {
      queued.push(serializeCookie(name, value, options));
    },
    delete(name, options) {
      queued.push(
        serializeCookie(name, '', {
          ...options,
          maxAge: 0,
          expires: new Date(0),
        }),
      );
    },
    outgoing() {
      return queued;
    },
  };
}

/**
 * Browser-backed cookie handle. Reads walk `document.cookie` (so they
 * always reflect the live state, unlike the server handle's request
 * snapshot), writes go straight to `document.cookie` via serialised
 * `Set-Cookie` strings. `outgoing()` always returns an empty list —
 * there is no separate response for the browser to attach cookies to,
 * so there's nothing to queue. HttpOnly cookies remain invisible here,
 * same as any other browser JS.
 *
 * Used by `@mikata/kit/client` so client-side re-runs of `load()` see
 * the same `cookies` interface as their server counterpart.
 */
export function createBrowserCookies(): Cookies {
  return {
    get(name) {
      return parseCookieHeader(
        typeof document !== 'undefined' ? document.cookie : '',
      )[name];
    },
    set(name, value, options) {
      if (typeof document !== 'undefined') {
        document.cookie = serializeCookie(name, value, options);
      }
    },
    delete(name, options) {
      if (typeof document !== 'undefined') {
        document.cookie = serializeCookie(name, '', {
          ...options,
          maxAge: 0,
          expires: new Date(0),
        });
      }
    },
    outgoing() {
      return [];
    },
  };
}

function capitalise(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
