/**
 * Utility functions for the reactivity system.
 */

import {
  pushSubscriber,
  popSubscriber,
} from './tracking';
import { batch as schedulerBatch } from './scheduler';

/**
 * Execute `fn` without tracking any reactive reads.
 * Useful when you need to read a signal/reactive value
 * inside an effect without creating a dependency.
 *
 * Usage:
 *   effect(() => {
 *     const id = userId();  // tracked
 *     const name = untrack(() => userName());  // NOT tracked
 *   });
 */
export function untrack<T>(fn: () => T): T {
  pushSubscriber(null);
  try {
    return fn();
  } finally {
    popSubscriber();
  }
}

/**
 * Batch multiple reactive writes together.
 * Effects are deferred until the batch completes.
 *
 * Note: writes in the same synchronous block are already auto-batched
 * via microtask scheduling. Use batch() for explicit control.
 *
 * Usage:
 *   batch(() => {
 *     setFirstName('John');
 *     setLastName('Doe');
 *     // Effects only run once after both writes
 *   });
 */
export { schedulerBatch as batch };

/**
 * Create an explicit dependency declaration.
 * Tracks `deps` but runs `fn` untracked with the dependency value.
 * Useful when you want to react to one thing but compute with another.
 *
 * Usage:
 *   effect(on(
 *     () => userId(),
 *     (id, prevId) => {
 *       // Only re-runs when userId changes
 *       // Can read other signals here without tracking them
 *       console.log(`User changed from ${prevId} to ${id}`);
 *     }
 *   ));
 */
export function on<T>(
  deps: () => T,
  fn: (value: T, prev: T | undefined) => void | (() => void),
  options?: { defer?: boolean }
): () => void | (() => void) {
  let prev: T | undefined;
  let initialized = !options?.defer;

  return () => {
    const value = deps(); // tracked

    if (!initialized) {
      initialized = true;
      prev = value;
      return;
    }

    // Run fn untracked so it doesn't create extra dependencies
    const result = untrack(() => fn(value, prev));
    prev = value;
    return result;
  };
}
