/**
 * Signed-cookie sessions for `@mikata/kit`.
 *
 * A *session* is a JSON value round-tripped through a single cookie,
 * tamper-evident via HMAC-SHA256. Compared to DB-backed sessions, the
 * trade-off is simplicity at the cost of bytes on every request and a
 * 4 KB cookie ceiling — good fits: user id + permissions, flash
 * messages, CSRF tokens, preference flags. Bad fits: anything that
 * needs to be revoked server-side instantly.
 *
 * Usage inside a route action:
 *
 *   // packages/kit/src/session.ts
 *   export const session = createSessionCookie<{ userId: string }>({
 *     name: 'sid',
 *     secret: process.env.SESSION_SECRET!,
 *     cookie: { path: '/', httpOnly: true, sameSite: 'lax' },
 *   });
 *
 *   // routes/login.tsx
 *   export async function action({ request, cookies }: ActionContext) {
 *     const form = await request.formData();
 *     const user = await authenticate(form.get('email'), form.get('password'));
 *     session.commit({ userId: user.id }, cookies);
 *     return redirect('/');
 *   }
 *
 *   // routes/index.tsx
 *   export async function load({ cookies }: LoadContext) {
 *     const user = session.read(cookies);
 *     return { user };
 *   }
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Cookies } from './cookies';

export interface SessionCookieOptions {
  /** Cookie name (what the browser sees). Keep it short to stay under 4 KB. */
  name: string;
  /**
   * Secret used to derive the HMAC. A single string is fine; an array
   * lets you rotate: the first entry signs new cookies and every entry
   * is accepted on read, so old sessions keep working while you phase
   * in a new key. Never commit these to source control.
   */
  secret: string | readonly string[];
  /**
   * Default cookie attributes used by `commit` and `destroy`. Typical
   * defaults are `{ path: '/', httpOnly: true, sameSite: 'lax' }`; turn
   * on `secure` in production. The helper only applies these — a commit
   * / destroy caller can override any field via the optional second
   * `CookieOptions` argument.
   */
  cookie?: CookieOptions;
}

/**
 * Per-session-type handle. `read` validates the inbound cookie and
 * returns the embedded payload (or `undefined` on a missing / tampered
 * cookie); `commit` signs a fresh payload and queues it as a
 * `Set-Cookie`; `destroy` queues a deletion. All three operate on a
 * `Cookies` handle — construct one per request and pass it through.
 */
export interface SessionCookie<T> {
  /** Read and verify. Returns `undefined` if the cookie is missing or invalid. */
  read(cookies: Cookies): T | undefined;
  /** Sign `value` and queue a Set-Cookie. Any `extra` options override defaults. */
  commit(value: T, cookies: Cookies, extra?: CookieOptions): void;
  /** Queue a Set-Cookie that tells the browser to drop this session. */
  destroy(cookies: Cookies, extra?: CookieOptions): void;
}

/**
 * Build a session handle. Pass a secret (string or array for rotation)
 * and the cookie name + default attributes. Generic `T` is the payload
 * shape — keep it small; a few hundred bytes max.
 *
 * A leading attribute worth calling out: a non-default `cookie.path`
 * must also be passed to `destroy` (same quirk as every other cookie
 * API) — the browser treats cookies with different paths as separate
 * entries, so a destroy queued at `/` will not overwrite one set at
 * `/admin`. The helper forwards `cookie` defaults into `destroy` so
 * the common case is handled automatically.
 */
export function createSessionCookie<T>(
  options: SessionCookieOptions,
): SessionCookie<T> {
  const secrets = Array.isArray(options.secret)
    ? (options.secret as readonly string[])
    : [options.secret as string];
  if (secrets.length === 0 || secrets.some((s) => !s)) {
    throw new Error('[mikata/kit/session] secret must be a non-empty string');
  }
  const primarySecret = secrets[0]!;
  const defaults = options.cookie ?? {};

  return {
    read(cookies) {
      const raw = cookies.get(options.name);
      if (!raw) return undefined;
      const verified = verify<T>(raw, secrets);
      return verified ?? undefined;
    },
    commit(value, cookies, extra) {
      const signed = sign(value, primarySecret);
      cookies.set(options.name, signed, { ...defaults, ...extra });
    },
    destroy(cookies, extra) {
      cookies.delete(options.name, { ...defaults, ...extra });
    },
  };
}

// ---------------------------------------------------------------------------
// internal: sign / verify
// ---------------------------------------------------------------------------

/**
 * Serialize and sign: `base64url(JSON) + '.' + base64url(HMAC)`.
 * The period is not base64url-legal, so it's a safe separator without
 * any extra escaping.
 */
function sign(value: unknown, secret: string): string {
  const payload = toBase64Url(Buffer.from(JSON.stringify(value), 'utf8'));
  const sig = hmac(payload, secret);
  return `${payload}.${sig}`;
}

/**
 * Verify a signed cookie against every supplied secret. Returns the
 * decoded payload on match, `null` on any failure (missing separator,
 * bad signature, malformed JSON, etc.). Constant-time comparison —
 * `timingSafeEqual` — prevents an attacker from probing signatures
 * one byte at a time.
 */
function verify<T>(raw: string, secrets: readonly string[]): T | null {
  const sep = raw.lastIndexOf('.');
  if (sep <= 0 || sep === raw.length - 1) return null;
  const payload = raw.slice(0, sep);
  const provided = raw.slice(sep + 1);
  const providedBuf = fromBase64Url(provided);
  if (!providedBuf || providedBuf.length === 0) return null;

  let match = false;
  for (const secret of secrets) {
    const expected = fromBase64Url(hmac(payload, secret));
    // Length check cheaply rules out a different-encoding mismatch so
    // timingSafeEqual (which throws on length mismatch) never fires.
    if (!expected || expected.length !== providedBuf.length) continue;
    if (timingSafeEqual(providedBuf, expected)) {
      match = true;
      break;
    }
  }
  if (!match) return null;

  const bytes = fromBase64Url(payload);
  if (!bytes) return null;
  try {
    return JSON.parse(bytes.toString('utf8')) as T;
  } catch {
    return null;
  }
}

function hmac(payload: string, secret: string): string {
  const mac = createHmac('sha256', secret);
  mac.update(payload, 'utf8');
  return toBase64Url(mac.digest());
}

function toBase64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const pad = value.length % 4;
  const padded = pad === 0 ? value : value + '='.repeat(4 - pad);
  const standard = padded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(standard, 'base64');
  } catch {
    return null;
  }
}
