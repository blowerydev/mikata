import { signal, onCleanup, type ReadSignal } from '@mikata/reactivity';

/**
 * Track whether the document is currently visible to the user.
 * Useful for pausing animations/polling when the tab is backgrounded.
 *
 * Usage:
 *   const visible = createPageVisibility();
 *   effect(() => visible() ? resume() : pause());
 */
export function createPageVisibility(): ReadSignal<boolean> {
  const [visible, setVisible] = signal(!document.hidden);
  const handler = () => setVisible(!document.hidden);
  document.addEventListener('visibilitychange', handler);
  onCleanup(() => document.removeEventListener('visibilitychange', handler));
  return visible;
}
