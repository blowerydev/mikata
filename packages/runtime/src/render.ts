/**
 * Entry point for mounting a Mikata application to the DOM.
 */

import { createScope } from '@mikata/reactivity';
import { installDevTools } from './devtools';
import { installErrorOverlay } from './error-overlay';

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
  if (__DEV__ && typeof window !== 'undefined') {
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
