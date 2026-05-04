/**
 * Signal - reactive primitive value container.
 *
 * Returns a [getter, setter] tuple. The getter is a plain function call
 * (no .value). Reading inside a tracked scope (effect/computed) subscribes
 * automatically. Writing triggers all subscribers.
 */

import {
  type ReactiveNode,
  track,
  clearSubscribers,
  getCurrentSubscriber,
  isInsideComputed,
} from './tracking';
import { scheduleDirty } from './scheduler';
import { registerNode, unregisterNode } from './debug';

declare const __DEV__: boolean;

const SIGNAL_BRAND = Symbol('mikata:signal');
const SIGNAL_NODES = new WeakMap<ReadSignal<unknown>, SignalNode<unknown>>();

export type ReadSignal<T> = (() => T) & { [SIGNAL_BRAND]: true };
export type WriteSignal<T> = {
  (value: T): void;
  (updater: (prev: T) => T): void;
};
export type Signal<T> = [get: ReadSignal<T>, set: WriteSignal<T>];

interface SignalNode<T> extends ReactiveNode {
  _value: T;
}

export function signal<T>(initialValue: T, label?: string): Signal<T> {
  const node: SignalNode<T> = {
    _value: initialValue,
    // `_sources` omitted — signals are sources only, never subscribers, so
    // the Set would never be populated. Saves one allocation per signal,
    // ~10k on a 10k-row list.
    _subscribers: [],
    _version: 0,
    _dirty: false,
    _dispose() {
      unregisterNode(this);
      clearSubscribers(this);
    },
  };

  if (__DEV__) {
    registerNode(node, 'signal', label, () => node._value);
  }

  const get = (() => {
    track(node);
    return node._value;
  }) as ReadSignal<T>;

  // Brand for isSignal() checks
  (get as any)[SIGNAL_BRAND] = true;
  SIGNAL_NODES.set(get as ReadSignal<unknown>, node as SignalNode<unknown>);

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
      for (let i = 0; i < node._subscribers.length; i++) {
        const sub = node._subscribers[i]!;
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

/**
 * Subscribe directly to a signal without creating an effect node.
 *
 * This is useful for store-style fanout where the callback only needs the
 * changed signal value and does not need dependency tracking, cleanup scopes,
 * or scheduler ordering. Use effect() when the callback reads dynamic
 * dependencies or participates in component lifecycle cleanup.
 */
export function subscribe<T>(
  source: ReadSignal<T>,
  fn: (value: T) => void,
): () => void {
  const sourceNode = SIGNAL_NODES.get(source as ReadSignal<unknown>) as SignalNode<T> | undefined;
  if (!sourceNode) {
    throw new TypeError('[mikata] subscribe() expects a signal getter.');
  }

  const subscriber: ReactiveNode = {
    _subscribers: [],
    _version: 0,
    _dirty: false,
    _markDirty() {
      fn(sourceNode._value);
    },
    _dispose() {
      const index = sourceNode._subscribers.indexOf(subscriber);
      if (index >= 0) sourceNode._subscribers.splice(index, 1);
    },
  };

  sourceNode._subscribers.push(subscriber);
  fn(sourceNode._value);
  return () => subscriber._dispose();
}

export function isSignal(value: unknown): value is ReadSignal<unknown> {
  return (
    typeof value === 'function' && (value as any)[SIGNAL_BRAND] === true
  );
}
