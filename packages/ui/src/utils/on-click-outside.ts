import { getCurrentScope, onCleanup } from '@mikata/reactivity';
import type { Ref } from '@mikata/runtime';

/**
 * Call `handler` when a click occurs outside the referenced element.
 * Automatically cleaned up when the scope disposes.
 */
export function onClickOutside(
  ref: Ref<HTMLElement>,
  handler: () => void
): void {
  const listener = (e: MouseEvent) => {
    const el = ref.current;
    if (!el || el.contains(e.target as Node)) return;
    handler();
  };

  // Use capture to detect clicks before they're stopped
  document.addEventListener('mousedown', listener, true);
  if (getCurrentScope()) {
    onCleanup(() => document.removeEventListener('mousedown', listener, true));
  }
}

/** @deprecated Use `onClickOutside` instead. */
export const useClickOutside = onClickOutside;
