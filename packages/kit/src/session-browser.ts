/**
 * Browser stub for `@mikata/kit/session`.
 *
 * The real implementation signs and verifies cookies with
 * `node:crypto`, which isn't available in the browser. Route modules
 * are shared between the SSR and client bundles though, so a client
 * build that transitively imports `@mikata/kit/session` would otherwise
 * pull `crypto` into the browser bundle and break.
 *
 * Vite resolves `@mikata/kit/session` via this file in browser builds
 * (selected by the `browser` exports condition). The handle has the
 * same shape as the real one, but every operation is a no-op:
 *
 *   - `read()` returns `undefined` — session cookies are `httpOnly` in
 *     practice, so `document.cookie` can't see them anyway. Any client
 *     code reading session state should be flowing through the loader
 *     data that the server already hydrated.
 *   - `commit()` / `destroy()` are no-ops — mutating a session from the
 *     browser would never have worked; session changes have to be made
 *     by an action running on the server.
 *
 * This is strictly a build-time shim. In dev mode against the Node
 * SSR server, all session calls hit the real module; in production
 * the client bundle never exercises these stubs because loaders and
 * actions re-run via `fetch` against the server rather than calling
 * `createSessionCookie` locally.
 */

import type { SessionCookieOptions, SessionCookie } from './session';

export type { SessionCookieOptions, SessionCookie };

export function createSessionCookie<T>(
  _options: SessionCookieOptions,
): SessionCookie<T> {
  return {
    read: () => undefined,
    commit: () => {},
    destroy: () => {},
  };
}
