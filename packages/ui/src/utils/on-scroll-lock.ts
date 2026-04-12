import { onCleanup } from '@mikata/reactivity';

/**
 * Lock body scroll while this scope is active.
 * Restores original overflow on cleanup.
 */
export function onScrollLock(): void {
  const original = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  onCleanup(() => {
    document.body.style.overflow = original;
  });
}

/** @deprecated Use `onScrollLock` instead. */
export const useScrollLock = onScrollLock;
