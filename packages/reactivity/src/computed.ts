/**
 * Computed - lazy, cached, pull-based derived value.
 *
 * Only recomputes when dependencies change AND when read.
 * Returns a getter function consistent with signal getters.
 */

import {
  type ReactiveNode,
  track,
  cleanupSources,
  cleanupStaleSources,
  cleanupPropertySources,
  clearSubscribers,
  beginDependencyTracking,
  pushSubscriber,
  popSubscriber,
  setInsideComputed,
} from './tracking';
import { scheduleDirty } from './scheduler';
import { registerNode, unregisterNode } from './debug';
import type { ReadSignal } from './signal';

declare const __DEV__: boolean;

const SIGNAL_BRAND = Symbol('mikata:signal');

export function computed<T>(fn: () => T, label?: string): ReadSignal<T> {
  let value: T;
  let initialized = false;
  let computing = false;
  // If fn() throws, cache the error and re-throw on every read until sources
  // change - otherwise subsequent reads would silently return the stale value.
  let error: unknown = undefined;
  let hasError = false;

  function recompute(): boolean {
    if (__DEV__ && computing) {
      throw new Error(
        `[mikata] Circular dependency detected in computed. ` +
        `A computed value is reading itself during its own evaluation.`
      );
    }
    computing = true;
    const trackEpoch = beginDependencyTracking();
    cleanupPropertySources(node);
    pushSubscriber(node, trackEpoch);
    if (__DEV__) setInsideComputed(true);
    try {
      const newValue = fn();
      hasError = false;
      error = undefined;
      if (!initialized || !Object.is(value, newValue)) {
        value = newValue;
        node._version++;
        initialized = true;
        return true;
      }
      initialized = true;
      return false;
    } catch (e) {
      hasError = true;
      error = e;
      // Treat error as initialized so we stop re-running fn on every read.
      // A source change will mark us dirty again and we'll retry naturally.
      initialized = true;
      throw e;
    } finally {
      if (__DEV__) setInsideComputed(false);
      popSubscriber();
      cleanupStaleSources(node, trackEpoch);
      computing = false;
    }
  }

  const node: ReactiveNode = {
    _sources: [],
    _sourceSlots: [],
    _sourceMarks: [],
    _subscribers: [],
    _version: 0,
    _dirty: true,

    _markDirty() {
      if (!node._dirty) {
        node._dirty = true;
        for (let i = 0; i < node._subscribers.length; i++) {
          const sub = node._subscribers[i]!;
          if (sub._markDirty) {
            sub._markDirty();
          } else {
            scheduleDirty(sub);
          }
        }
      }
    },

    _revalidate(): boolean {
      if (node._dirty || !initialized) {
        // First, revalidate our own computed sources
        for (const source of node._sources!) {
          if (source._revalidate) {
            source._revalidate();
          }
        }
        const changed = recompute();
        node._dirty = false;
        return changed;
      }
      return false;
    },

    _dispose() {
      unregisterNode(this);
      cleanupSources(this);
      cleanupPropertySources(this);
      clearSubscribers(this);
    },
  };

  if (__DEV__) {
    registerNode(node, 'computed', label, () => value);
  }

  const get = (() => {
    track(node);

    if (node._dirty || !initialized) {
      try {
        recompute();
      } finally {
        node._dirty = false;
      }
    }

    if (hasError) throw error;
    return value;
  }) as ReadSignal<T>;

  (get as any)[SIGNAL_BRAND] = true;

  return get;
}
