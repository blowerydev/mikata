/**
 * createSelector - efficient O(1) selection tracking for lists.
 *
 * Avoids re-rendering the entire list when the selected item changes.
 * Only the previously-selected and newly-selected items are notified.
 *
 * Each item gets its own signal that only toggles when that specific
 * item becomes selected or deselected.
 */

import { signal, effect, untrack, onCleanup, type ReadSignal } from '@mikata/reactivity';

interface SelectorEntry<U> {
  sig: [ReadSignal<boolean>, (v: boolean) => void];
  refs: number;
}

/**
 * Create an efficient selector for list selection patterns.
 *
 * Usage:
 *   const [selectedId, setSelectedId] = signal(1);
 *   const isSelected = createSelector(() => selectedId());
 *
 *   // In a list item - only re-runs for the specific item that changes selection:
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
  // Refcounted by reading scope so entries are pruned when callers dispose,
  // preventing unbounded growth in long-running apps that rotate list items.
  const itemSignals = new Map<U, SelectorEntry<U>>();

  let prevValue: T | undefined;
  let initialized = false;

  // Watch the source and toggle only the affected item signals
  effect(() => {
    const value = source();

    if (initialized) {
      // Toggle signals: check each registered item against old and new value
      for (const [item, entry] of itemSignals) {
        const wasSelected = equals(item, prevValue!);
        const isNowSelected = equals(item, value);
        if (wasSelected !== isNowSelected) {
          entry.sig[1](isNowSelected);
        }
      }
    }

    prevValue = value;
    initialized = true;
  });

  return (item: U): boolean => {
    // Get or create the signal for this item
    let entry = itemSignals.get(item);
    if (!entry) {
      const currentValue = untrack(source);
      entry = { sig: signal(equals(item, currentValue)), refs: 0 };
      itemSignals.set(item, entry);
    }
    entry.refs++;
    const captured = entry;
    onCleanup(() => {
      if (--captured.refs === 0 && itemSignals.get(item) === captured) {
        itemSignals.delete(item);
      }
    });
    // Reading the signal subscribes the current effect to this item's changes
    return entry.sig[0]();
  };
}
