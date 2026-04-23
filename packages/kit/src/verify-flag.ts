/**
 * Prerender → renderRoute signalling for hydration verification.
 *
 * Prerender flips `_setVerifyHydration(true)` for the duration of a build
 * so every page render runs `renderToString({ verifyHydration: true })`
 * without forcing users' entry-server.tsx to learn about the option.
 * `renderRoute` reads the flag as its default.
 *
 * Kept as its own (dependency-free) module so `prerender.ts` can import
 * the setter without pulling the full server render pipeline into
 * `vite.config.ts`'s bundle graph — that chain transitively loads
 * `@mikata/runtime`, whose module-init `__DEV__` references blow up
 * the config loader with a ReferenceError.
 */

let on = false;

export function _setVerifyHydration(value: boolean): void {
  on = value;
}

export function _getVerifyHydration(): boolean {
  return on;
}
