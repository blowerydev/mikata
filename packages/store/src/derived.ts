/**
 * derived — alias for computed, named for discoverability
 * when used with stores.
 */

import { computed, type ReadSignal } from '@mikata/reactivity';

/**
 * Create a derived value from a store or other reactive sources.
 * Semantically the same as computed(), named for store contexts.
 *
 * Usage:
 *   const [store] = createStore({ items: [1, 2, 3] });
 *   const total = derived(() => store.items.reduce((a, b) => a + b, 0));
 */
export function derived<T>(fn: () => T): ReadSignal<T> {
  return computed(fn);
}
