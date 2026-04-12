import { onCleanup } from '@mikata/reactivity';

/**
 * Attach an event listener to `window`, cleaned up on scope disposal.
 *
 * Usage:
 *   onWindowEvent('resize', () => ...);
 */
export function onWindowEvent<K extends keyof WindowEventMap>(
  event: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void {
  window.addEventListener(event, handler as EventListener, options);
  onCleanup(() => {
    window.removeEventListener(event, handler as EventListener, options);
  });
}
