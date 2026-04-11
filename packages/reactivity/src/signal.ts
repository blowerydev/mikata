/**
 * Signal — reactive primitive value container.
 *
 * Returns a [getter, setter] tuple. The getter is a plain function call
 * (no .value). Reading inside a tracked scope (effect/computed) subscribes
 * automatically. Writing triggers all subscribers.
 */

import {
  type ReactiveNode,
  track,
  getCurrentSubscriber,
  isInsideComputed,
} from './tracking';
import { scheduleDirty } from './scheduler';

declare const __DEV__: boolean;

const SIGNAL_BRAND = Symbol('mikata:signal');

export type ReadSignal<T> = (() => T) & { [SIGNAL_BRAND]: true };
export type WriteSignal<T> = {
  (value: T): void;
  (updater: (prev: T) => T): void;
};
export type Signal<T> = [get: ReadSignal<T>, set: WriteSignal<T>];

interface SignalNode<T> extends ReactiveNode {
  _value: T;
}

export function signal<T>(initialValue: T): Signal<T> {
  const node: SignalNode<T> = {
    _value: initialValue,
    _sources: new Set(),
    _subscribers: new Set(),
    _version: 0,
    _dirty: false,
    _dispose() {
      this._subscribers.clear();
    },
  };

  const get = (() => {
    track(node);
    return node._value;
  }) as ReadSignal<T>;

  // Brand for isSignal() checks
  (get as any)[SIGNAL_BRAND] = true;

  const set = ((valueOrUpdater: T | ((prev: T) => T)) => {
    if (__DEV__ && isInsideComputed()) {
      console.warn(
        `[mikata] Writing to a signal inside a computed is a bug. ` +
        `Computed values should be pure derivations with no side effects.`
      );
    }

    const newValue =
      typeof valueOrUpdater === 'function'
        ? (valueOrUpdater as (prev: T) => T)(node._value)
        : valueOrUpdater;

    if (!Object.is(node._value, newValue)) {
      node._value = newValue;
      node._version++;
      // Notify all subscribers
      for (const sub of node._subscribers) {
        if (sub._markDirty) {
          sub._markDirty();
        } else {
          scheduleDirty(sub);
        }
      }
    }
  }) as WriteSignal<T>;

  return [get, set];
}

export function isSignal(value: unknown): value is ReadSignal<unknown> {
  return (
    typeof value === 'function' && (value as any)[SIGNAL_BRAND] === true
  );
}
