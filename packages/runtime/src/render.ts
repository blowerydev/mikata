/**
 * Entry point for mounting a Mikata application to the DOM.
 */

import { createScope } from '@mikata/reactivity';
import { installDevTools } from './devtools';

declare const __DEV__: boolean;

let devToolsInstalled = false;

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
  container: HTMLElement
): () => void {
  // Auto-install devtools on first render in dev mode
  if (__DEV__ && !devToolsInstalled && typeof window !== 'undefined') {
    devToolsInstalled = true;
    installDevTools();
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
