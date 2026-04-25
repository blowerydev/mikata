import { onCleanup } from '@mikata/reactivity';

let lockCount = 0;
let originalOverflow = '';

/**
 * Lock body scroll while this scope is active.
 * Restores original overflow on cleanup.
 */
export function onScrollLock(): void {
  if (lockCount === 0) originalOverflow = document.body.style.overflow;
  lockCount++;
  document.body.style.overflow = 'hidden';
  onCleanup(() => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow;
      originalOverflow = '';
    }
  });
}

/** @deprecated Use `onScrollLock` instead. */
export const useScrollLock = onScrollLock;
