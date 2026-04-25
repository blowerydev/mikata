/**
 * Deferred-hydration helpers. Each one resolves when a particular browser
 * readiness signal has fired and is composable on its own (await it,
 * then call hydrate / mount / whatever) or via the `defer` option on
 * hydrate() which dispatches to the right helper for you.
 *
 * Why these exist: Vite (and any dev server) serves the JS bundle and
 * the CSS bundle independently. A naive hydrate() runs as soon as the
 * JS module evaluates, before the linked stylesheet has finished
 * parsing. Components that measure layout (offsetLeft,
 * getBoundingClientRect) then read pre-CSS values and position
 * themselves wrong - the classic SegmentedControl-pill-off-screen
 * footprint. Production builds inline critical CSS or block on the
 * stylesheet, so the race is invisible there; dev mode surfaces it.
 */

import { suppressLeakTracking } from '@mikata/reactivity';

/**
 * Resolve when every `<link rel="stylesheet">` in the current document
 * has loaded (its `.sheet` is populated) or errored. No-op on the
 * server.
 */
export function whenStylesheetsReady(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  );
  const pending = links.filter((link) => !link.sheet);
  if (pending.length === 0) return Promise.resolve();
  return Promise.all(
    pending.map(
      (link) =>
        new Promise<void>((resolve) => {
          // The framework owns these listeners and tears them down via
          // `once: true`; suppress the dev leak detector for the pair.
          suppressLeakTracking(() => {
            link.addEventListener('load', () => resolve(), { once: true });
            link.addEventListener('error', () => resolve(), { once: true });
          });
        }),
    ),
  ).then(() => undefined);
}

/**
 * Resolve on `window.load` (everything - stylesheets, images, fonts -
 * has finished). Returns immediately if `document.readyState` is already
 * `'complete'`. No-op on the server.
 */
export function whenLoad(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise<void>((resolve) => {
    suppressLeakTracking(() => {
      window.addEventListener('load', () => resolve(), { once: true });
    });
  });
}

/**
 * Resolve on the next idle callback, or after `timeout` ms if the
 * browser never reports idle. Falls back to a microtask-equivalent
 * (`setTimeout(0)`) where requestIdleCallback is unavailable.
 */
export function whenIdle(timeout = 2000): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const ric = (
    window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout?: number },
      ) => number;
    }
  ).requestIdleCallback;
  if (typeof ric === 'function') {
    return new Promise<void>((resolve) => ric(() => resolve(), { timeout }));
  }
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * The strategy passed to `hydrate(..., { defer })`. Strings select a
 * built-in helper; a function lets the caller plug in arbitrary
 * readiness logic (its return value is awaited).
 */
export type HydrateDeferStrategy =
  | 'css'
  | 'load'
  | 'idle'
  | (() => Promise<unknown> | unknown);

export function resolveDefer(strategy: HydrateDeferStrategy): Promise<void> {
  if (strategy === 'css') return whenStylesheetsReady();
  if (strategy === 'load') return whenLoad();
  if (strategy === 'idle') return whenIdle();
  return Promise.resolve(strategy()).then(() => undefined);
}
