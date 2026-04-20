/**
 * CSRF protection for `<Form>` submissions — browser-safe surface.
 *
 * This module holds the bits `<Form>` and the client entry need: the
 * constants that name the cookie / header / global, and the context
 * that carries the per-request token through the render tree. The
 * node-only helpers that *issue* and *verify* tokens live in
 * `csrf-server.ts` — keeping them out of here means `form.ts` can
 * import `useCsrfToken` without dragging `node:crypto` into a browser
 * bundle.
 *
 * Strategy: the double-submit cookie pattern. On every page render kit
 * ensures a random token lives in an HttpOnly cookie (`mikata_csrf`) and
 * embeds the same value both in a window global (`__MIKATA_CSRF__`)
 * and in a component context. On any non-GET page request the server
 * compares the submitted token (form field `_csrf` or `X-Mikata-CSRF`
 * header) against the cookie — if either is missing or they don't
 * match, the action is refused with `403`.
 *
 * API routes are deliberately *not* covered — their auth model is
 * different (Bearer tokens / API keys) and imposing a cookie handshake
 * would break non-browser clients.
 */

import { createContext, provide, inject } from '@mikata/runtime';
import type { CookieOptions } from './cookies';

/** Cookie the server writes and the client echoes back on submit. */
export const CSRF_COOKIE_NAME = 'mikata_csrf';
/** Form field name kit injects inside `<Form>` for double-submit. */
export const CSRF_FORM_FIELD = '_csrf';
/** Header alternative to the form field (used by enhanced submit). */
export const CSRF_HEADER = 'X-Mikata-CSRF';
/** Window global the server uses to hand the token off to client JS. */
export const CSRF_GLOBAL = '__MIKATA_CSRF__';

export interface CsrfTokenOptions {
  /** Cookie name. Defaults to {@link CSRF_COOKIE_NAME}. */
  cookieName?: string;
  /**
   * Cookie options applied when the token is first issued. Sensible
   * defaults: `path=/`, `HttpOnly`, `SameSite=Lax`. `secure` defaults to
   * `false` so localhost dev works — set it to `true` in production.
   */
  cookie?: CookieOptions;
}

/** Context payload `<Form>` reads to inject its hidden CSRF input. */
export interface CsrfContextValue {
  token: string;
}

export const CsrfContext = createContext<CsrfContextValue | undefined>(
  undefined,
);

/**
 * Seed the CSRF context for a render scope. Called by kit's server +
 * client entries with the per-request token; user code typically never
 * reaches for this directly.
 */
export function provideCsrfToken(token: string): void {
  provide(CsrfContext, { token });
}

/**
 * Read the current CSRF token, or `undefined` when no provider is in
 * scope (e.g. a `<Form>` used outside kit's `mount()` / `renderRoute()`).
 * Consumers that want to render a custom hidden input can reach for
 * this directly instead of relying on `<Form>`'s auto-injection.
 */
export function useCsrfToken(): string | undefined {
  try {
    return inject(CsrfContext)?.token;
  } catch {
    return undefined;
  }
}
