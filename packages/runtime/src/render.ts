/**
 * Entry point for mounting a Mikata application to the DOM.
 */

import { createScope } from '@mikata/reactivity';
import { installDevTools } from './devtools';
import { installErrorOverlay } from './error-overlay';
import { isSSR } from './env';
import { beginHydration, endHydration } from './adopt';

declare const __DEV__: boolean;

let devToolsInstalled = false;
let errorOverlayInstalled = false;

export interface RenderOptions {
  /**
   * Show a fixed-position overlay for uncaught errors / unhandled rejections
   * in dev mode. Default: true. Set to false to disable (e.g. when you already
   * have your own error reporter). Can also be disabled globally by setting
   * `window.__MIKATA_ERROR_OVERLAY__ = false` before the first render.
   */
  errorOverlay?: boolean;
}

/**
 * Render a component tree into a container element.
 * Returns a dispose function that unmounts the app and cleans up.
 *
 * Usage:
 *   const dispose = render(() => <App />, document.getElementById('root')!);
 *   // Later: dispose() to unmount
 */
export function render(
  component: () => Node,
  container: HTMLElement,
  options: RenderOptions = {},
): () => void {
  if (__DEV__ && !isSSR() && typeof window !== 'undefined') {
    if (!devToolsInstalled) {
      devToolsInstalled = true;
      installDevTools();
    }
    const globalFlag = (window as unknown as { __MIKATA_ERROR_OVERLAY__?: boolean }).__MIKATA_ERROR_OVERLAY__;
    const overlayEnabled = options.errorOverlay !== false && globalFlag !== false;
    if (overlayEnabled && !errorOverlayInstalled) {
      errorOverlayInstalled = true;
      installErrorOverlay();
    }
  }

  // Clear container
  container.textContent = '';

  const scope = createScope(() => {
    const el = component();
    container.appendChild(el);
  });

  return () => {
    scope.dispose();
    container.textContent = '';
  };
}

/**
 * Hydrate a pre-rendered (SSR) tree into an interactive Mikata app.
 *
 * Unlike `render()`, `hydrate()` does not clear the container — it walks
 * the existing DOM and adopts each server-emitted node as the compiled
 * client code asks for it, then attaches event listeners via the normal
 * `_delegate` path. The practical upshot: no flicker, the first paint
 * the user saw is the live DOM.
 *
 * Usage:
 *   // in HTML: <div id="root"><!-- server output --></div>
 *   hydrate(() => <App />, document.getElementById('root')!);
 */
export function hydrate(
  component: () => Node,
  container: HTMLElement,
  options: RenderOptions = {},
): () => void {
  if (__DEV__ && !isSSR() && typeof window !== 'undefined') {
    if (!devToolsInstalled) {
      devToolsInstalled = true;
      installDevTools();
    }
    const globalFlag = (window as unknown as { __MIKATA_ERROR_OVERLAY__?: boolean }).__MIKATA_ERROR_OVERLAY__;
    const overlayEnabled = options.errorOverlay !== false && globalFlag !== false;
    if (overlayEnabled && !errorOverlayInstalled) {
      errorOverlayInstalled = true;
      installErrorOverlay();
    }
  }

  beginHydration(container);
  let scope;
  try {
    scope = createScope(() => {
      // Component returns the root node — during hydration this IS the
      // adopted server-rendered root, so no appendChild is needed.
      component();
    });
  } finally {
    endHydration();
  }

  return () => {
    scope.dispose();
    container.textContent = '';
  };
}
