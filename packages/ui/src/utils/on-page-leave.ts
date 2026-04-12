import { onCleanup } from '@mikata/reactivity';

/**
 * Warn the user before they leave the page. `shouldBlock` is evaluated at
 * `beforeunload` time — make it a function that reads a signal if the answer
 * depends on reactive state.
 *
 * Usage:
 *   onPageLeave(() => form.isDirty());
 */
export function onPageLeave(shouldBlock: () => boolean): void {
  const handler = (event: BeforeUnloadEvent) => {
    if (!shouldBlock()) return;
    event.preventDefault();
    // Legacy requirement for some browsers
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', handler);
  onCleanup(() => window.removeEventListener('beforeunload', handler));
}
