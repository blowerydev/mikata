import { effect, onCleanup } from '@mikata/reactivity';

/**
 * Bind `document.title` to a reactive source. Restores the previous title
 * when the scope cleans up.
 *
 * Usage:
 *   onDocumentTitle(() => `Inbox (${unread()})`);
 */
export function onDocumentTitle(source: () => string): void {
  const original = document.title;
  effect(() => {
    document.title = source();
  });
  onCleanup(() => {
    document.title = original;
  });
}
