/**
 * Environment flag — `@mikata/server` flips this for the duration of a
 * `renderToString()` call so the runtime can skip browser-only work
 * (onMount callbacks, dev tool installation, etc.) during SSR.
 *
 * Kept in its own module so every package that cares can import the
 * same source of truth without pulling the server bundle.
 */

let ssr = false;

export function isSSR(): boolean {
  return ssr;
}

/** Called by `@mikata/server` before running a component tree. */
export function _setSSR(active: boolean): void {
  ssr = active;
}
