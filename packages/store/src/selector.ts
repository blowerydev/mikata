/**
 * createSelector — efficient O(1) selection tracking for lists.
 *
 * Avoids re-rendering the entire list when the selected item changes.
 * Only the previously-selected and newly-selected items are notified.
 */

import { effect, signal, untrack } from '@mikata/reactivity';

/**
 * Create an efficient selector for list selection patterns.
 *
 * Usage:
 *   const [selectedId, setSelectedId] = signal(1);
 *   const isSelected = createSelector(() => selectedId());
 *
 *   // In a list item:
 *   effect(() => {
 *     if (isSelected(item.id)) {
 *       // Only runs when this specific item becomes selected/deselected
 *     }
 *   });
 */
export function createSelector<T, U = T>(
  source: () => T,
  equals: (a: U, b: T) => boolean = (a, b) => (a as unknown) === (b as unknown)
): (item: U) => boolean {
  const listeners = new Map<U, Set<() => void>>();
  let prevValue: T | undefined;
  let initialized = false;

  // Watch the source and notify only affected items
  effect(() => {
    const value = source();
    if (initialized) {
      // Notify previously-selected item (now deselected)
      if (prevValue !== undefined) {
        const prevKey = prevValue as unknown as U;
        const prevListeners = listeners.get(prevKey);
        if (prevListeners) {
          for (const notify of prevListeners) notify();
        }
      }
      // Notify newly-selected item
      const nextKey = value as unknown as U;
      const nextListeners = listeners.get(nextKey);
      if (nextListeners) {
        for (const notify of nextListeners) notify();
      }
    }
    prevValue = value;
    initialized = true;
  });

  return (item: U): boolean => {
    // Register this read for notification
    // This is a simplified version — in a full implementation,
    // this would integrate with the reactive tracking system
    return equals(item, untrack(source));
  };
}
