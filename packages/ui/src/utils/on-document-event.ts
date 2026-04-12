import { onCleanup } from '@mikata/reactivity';

/**
 * Attach an event listener to `document`, cleaned up on scope disposal.
 *
 * Usage:
 *   onDocumentEvent('keydown', (e) => ...);
 */
export function onDocumentEvent<K extends keyof DocumentEventMap>(
  event: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void {
  document.addEventListener(event, handler as EventListener, options);
  onCleanup(() => {
    document.removeEventListener(event, handler as EventListener, options);
  });
}
