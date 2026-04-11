/**
 * createSelector — efficient O(1) selection tracking for lists.
 *
 * Avoids re-rendering the entire list when the selected item changes.
 * Only the previously-selected and newly-selected items are notified.
 *
 * Each item gets its own signal that only toggles when that specific
 * item becomes selected or deselected.
 */

import { signal, effect, untrack, type ReadSignal } from '@mikata/reactivity';

/**
 * Create an efficient selector for list selection patterns.
 *
 * Usage:
 *   const [selectedId, setSelectedId] = signal(1);
 *   const isSelected = createSelector(() => selectedId());
 *
 *   // In a list item — only re-runs for the specific item that changes selection:
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
  // Each item key gets its own signal that tracks whether it's selected.
  const itemSignals = new Map<U, [ReadSignal<boolean>, (v: boolean) => void]>();

  let prevValue: T | undefined;
  let initialized = false;

  // Watch the source and toggle only the affected item signals
  effect(() => {
    const value = source();

    if (initialized) {
      // Toggle signals: check each registered item against old and new value
      for (const [item, [, setter]] of itemSignals) {
        const wasSelected = equals(item, prevValue!);
        const isNowSelected = equals(item, value);
        if (wasSelected !== isNowSelected) {
          setter(isNowSelected);
        }
      }
    }

    prevValue = value;
    initialized = true;
  });

  return (item: U): boolean => {
    // Get or create the signal for this item
    let sig = itemSignals.get(item);
    if (!sig) {
      const currentValue = untrack(source);
      sig = signal(equals(item, currentValue));
      itemSignals.set(item, sig);
    }
    // Reading the signal subscribes the current effect to this item's changes
    return sig[0]();
  };
}
