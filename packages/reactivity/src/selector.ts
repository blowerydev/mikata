/**
 * Fine-grained equality selector. Given a source signal-like getter, returns
 * a function `isSelected(key)` that is `true` only when `source()` equals
 * `key`. Any subscriber that reads `isSelected(k)` will only be re-run when
 * the source transitions INTO or OUT OF `k` - not on every source change.
 *
 * Intended for list-row selection, tab highlighting, route matching, and
 * similar patterns where a single shared value decides which of N items is
 * "active". A naive `source() === row.id` read inside each row's renderEffect
 * causes O(n) effect re-runs on every change; `createSelector` collapses that
 * to O(1) per transition (for the default `===` equals; see below).
 *
 * Generics: `T` is the source value type; `U` is the query-key type (defaults
 * to `T`). A custom `equals(key, sourceValue)` lets callers query keys of a
 * different shape than the source - e.g. matching numeric keys against
 * `{id}` objects.
 *
 * Performance: with the default equals, selection changes are O(1) - we look
 * up only the prev and next buckets. With a custom `equals` we must iterate
 * every registered key on each source change to ask which flipped, so the
 * work is O(k) where k = distinct keys ever queried. Still avoids re-running
 * effects whose selection didn't actually change.
 */

import {
  type ReactiveNode,
  getCurrentSubscriber,
  cleanupSources,
  pushSubscriber,
  popSubscriber,
} from './tracking';
import { scheduleDirty } from './scheduler';

const DEFAULT_EQUALS = <U, T>(a: U, b: T): boolean =>
  (a as unknown) === (b as unknown);

export function createSelector<T, U = T>(
  source: () => T,
  equals: (key: U, sourceValue: T) => boolean = DEFAULT_EQUALS,
): (key: U) => boolean {
  // One fake source-node per distinct key queried. Subscribers track the
  // bucket they care about via the standard _sources/_subscribers edges,
  // so cleanupSources during re-runs drops stale links automatically.
  const buckets = new Map<U, ReactiveNode>();
  let currentValue: T;
  const isDefaultEquals = equals === DEFAULT_EQUALS;

  const notifyBucket = (key: U): void => {
    const bucket = buckets.get(key);
    if (!bucket) return;
    // Bump version so subscribers' _sourceVersions check sees a change
    // and doesn't short-circuit the re-run.
    bucket._version++;
    for (const sub of bucket._subscribers) {
      if (sub._markDirty) sub._markDirty();
      else scheduleDirty(sub);
    }
  };

  // Lazy-GC empty buckets so long-running apps that rotate keys don't grow
  // the bucket map unboundedly. Called from the iteration path.
  const pruneIfEmpty = (key: U, bucket: ReactiveNode): boolean => {
    if (bucket._subscribers.size === 0) {
      buckets.delete(key);
      return true;
    }
    return false;
  };

  const watcher: ReactiveNode = {
    _sources: new Set(),
    _subscribers: new Set(),
    _version: 0,
    _dirty: false,
    _run() {
      cleanupSources(watcher);
      pushSubscriber(watcher);
      let nextValue: T;
      try {
        nextValue = source();
      } finally {
        popSubscriber();
      }
      if (Object.is(currentValue, nextValue)) return;
      const prev = currentValue;
      currentValue = nextValue;
      if (isDefaultEquals) {
        // Fast path: the winning key IS the source value. Just look up
        // the two buckets whose selected-state flipped.
        notifyBucket(prev as unknown as U);
        notifyBucket(nextValue as unknown as U);
      } else {
        // Custom equals: iterate every known key and re-check. Prune empty
        // buckets as we go so disposed scopes don't inflate the iteration.
        for (const [key, bucket] of buckets) {
          if (pruneIfEmpty(key, bucket)) continue;
          const wasSelected = equals(key, prev);
          const isNowSelected = equals(key, nextValue);
          if (wasSelected !== isNowSelected) notifyBucket(key);
        }
      }
    },
    _markDirty() {
      scheduleDirty(watcher);
    },
    _dispose() {
      cleanupSources(watcher);
    },
  };

  // Prime initial value without firing notifications.
  pushSubscriber(watcher);
  try {
    currentValue = source();
  } finally {
    popSubscriber();
  }

  return (key: U): boolean => {
    const sub = getCurrentSubscriber();
    if (sub) {
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          _sources: new Set(),
          _subscribers: new Set(),
          _version: 0,
          _dirty: false,
          _dispose() {},
        };
        buckets.set(key, bucket);
      }
      bucket._subscribers.add(sub);
      sub._sources.add(bucket);
    }
    return equals(key, currentValue);
  };
}
