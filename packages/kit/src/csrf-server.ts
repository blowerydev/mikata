/**
 * Server-side CSRF helpers — token minting + verification.
 *
 * Split from `csrf.ts` so the browser bundle of `<Form>` doesn't pull
 * in `node:crypto`. Importers here are server-only: `server.ts` and
 * user code that wants to guard a custom route.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies, CookieOptions } from './cookies';
import {
  CSRF_COOKIE_NAME,
  CSRF_FORM_FIELD,
  CSRF_HEADER,
  type CsrfTokenOptions,
} from './csrf';

/**
 * Generate a fresh 32-byte random token, base64url-encoded. `randomBytes`
 * is cryptographically strong; 32 bytes gives 256 bits of entropy, well
 * past any practical guess attack.
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Read the CSRF token from the request cookies, or mint + queue a new
 * one if the cookie is missing. Returns the token so the render tree
 * can embed it.
 *
 * Tokens are *not* rotated per request. Rotation would race with any
 * form currently displayed in another tab: submit from the stale tab
 * would fail verification. A single stable per-session token keeps the
 * UX simple while the `HttpOnly` + `SameSite=Lax` cookie flags carry
 * the security weight.
 */
export function ensureCsrfToken(
  cookies: Cookies,
  options: CsrfTokenOptions = {},
): string {
  const name = options.cookieName ?? CSRF_COOKIE_NAME;
  const existing = cookies.get(name);
  // Require a reasonable minimum length so junk values (`""`, short
  // strings from other codepaths) don't bypass regeneration.
  if (existing && existing.length >= 16) return existing;

  const token = generateCsrfToken();
  const cookieOptions: CookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    ...options.cookie,
  };
  cookies.set(name, token, cookieOptions);
  return token;
}

/**
 * Verify a request's CSRF token against the cookie. Returns `true` only
 * when both are present and byte-for-byte equal. Header wins over form
 * field when both are supplied — it's the path enhanced submit uses and
 * avoids consuming the request body when not needed.
 *
 * When verification needs the body, the request is cloned first so the
 * caller's `request.formData()` still works in the route action.
 */
export async function verifyCsrfFromRequest(
  request: Request,
  cookies: Cookies,
  options: CsrfTokenOptions = {},
): Promise<boolean> {
  const name = options.cookieName ?? CSRF_COOKIE_NAME;
  const expected = cookies.get(name);
  if (!expected) return false;

  const submitted = await extractSubmittedToken(request);
  if (!submitted) return false;

  return safeCompare(expected, submitted);
}

async function extractSubmittedToken(
  request: Request,
): Promise<string | null> {
  const headerToken = request.headers.get(CSRF_HEADER);
  if (headerToken) return headerToken;

  const contentType = request.headers.get('content-type') ?? '';
  const isForm =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');
  if (!isForm) return null;

  try {
    // Clone so the action can still read `request.formData()` itself —
    // Request bodies are single-use streams.
    const clone = request.clone();
    const form = await clone.formData();
    const value = form.get(CSRF_FORM_FIELD);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Constant-time string comparison. Length check first (cheap), then
 * `timingSafeEqual` on equal-length buffers. Wrapping in try/catch
 * handles exotic inputs that `Buffer.from` might choke on.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
