/**
 * Reactive - deep Proxy wrapper for objects and arrays.
 *
 * Provides transparent read/write tracking at the property level.
 * Nested objects are lazily wrapped in proxies on access.
 * Shares the same tracking infrastructure as signals.
 */

import {
  trackProperty,
  getPropertySubscribers,
  isInsideComputed,
} from './tracking';
import { scheduleDirty } from './scheduler';

declare const __DEV__: boolean;

const REACTIVE_BRAND = Symbol('mikata:reactive');
const RAW_SYMBOL = Symbol('mikata:raw');

const proxyCache = new WeakMap<object, object>();

// Array methods that mutate and need special handling
const ARRAY_MUTATING_METHODS = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
]);

// Reordering mutators move values between arbitrary slots, so we must
// re-fire every existing index subscriber - tracking the affected range
// per-method would be more surgical but the safer default is to invalidate
// all indices that existed before or after the call. push/pop only touch
// the end and are handled below by length + the single end index.
const ARRAY_REORDERING_METHODS = new Set([
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
]);

function triggerProperty(target: object, key: PropertyKey): void {
  const deps = getPropertySubscribers(target, key);
  if (deps) {
    for (const sub of deps) {
      if (sub._markDirty) {
        sub._markDirty();
      } else {
        scheduleDirty(sub);
      }
    }
  }
}

function createProxy<T extends object>(target: T): T {
  // Return existing proxy if already created
  if (proxyCache.has(target)) {
    return proxyCache.get(target) as T;
  }

  const isArray = Array.isArray(target);

  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // Allow access to raw underlying object
      if (key === RAW_SYMBOL) return target;
      if (key === REACTIVE_BRAND) return true;

      const value = Reflect.get(target, key, receiver);

      // Don't track symbol properties (internal stuff)
      if (typeof key === 'symbol') return value;

      // For arrays, intercept mutating methods to batch their effects
      if (isArray && typeof value === 'function' && ARRAY_MUTATING_METHODS.has(key as string)) {
        return function (this: unknown, ...args: unknown[]) {
          const arr = target as unknown as unknown[];
          const oldLength = arr.length;
          const methodName = key as string;
          const result = (value as Function).apply(target, args);
          const newLength = arr.length;

          // Notify length, the method itself, and iteration consumers
          // (Object.keys / spread / for..of) when any structural change
          // occurred. Methods like sort/reverse keep length stable but
          // still alter iteration order, so always fire iteration on
          // mutators - it's a single notification per call.
          triggerProperty(target, 'length');
          triggerProperty(target, methodName);
          triggerProperty(target, Symbol.iterator);

          if (ARRAY_REORDERING_METHODS.has(methodName)) {
            // Conservatively fire every index that existed before or
            // after the mutation. Subscribers to a specific index that
            // didn't actually change value still re-run, but their
            // _sourceVersions snapshot makes the effect a no-op.
            const max = oldLength > newLength ? oldLength : newLength;
            for (let i = 0; i < max; i++) {
              triggerProperty(target, String(i));
            }
          } else if (methodName === 'push') {
            // push appends one or more items at the tail; only the
            // new indices need invalidating.
            for (let i = oldLength; i < newLength; i++) {
              triggerProperty(target, String(i));
            }
          } else if (methodName === 'pop') {
            // pop drops the final index, if any.
            if (oldLength > 0) triggerProperty(target, String(oldLength - 1));
          }
          return result;
        };
      }

      // Track the property read
      trackProperty(target, key);

      // Deep proxy: wrap nested objects lazily
      if (value !== null && typeof value === 'object' && !((value as any)[REACTIVE_BRAND])) {
        return createProxy(value);
      }

      return value;
    },

    set(target, key, value, receiver) {
      if (__DEV__ && isInsideComputed() && typeof key !== 'symbol') {
        console.warn(
          `[mikata] Writing to reactive property "${String(key)}" inside a computed is a bug. ` +
          `Computed values should be pure derivations with no side effects.`
        );
      }

      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const oldValue = Reflect.get(target, key, receiver);

      // Unwrap reactive values before storing
      if (value !== null && typeof value === 'object' && (value as any)[RAW_SYMBOL]) {
        value = (value as any)[RAW_SYMBOL];
      }

      const result = Reflect.set(target, key, value, receiver);

      if (!Object.is(oldValue, value)) {
        triggerProperty(target, key);

        // For arrays, setting an index may change length
        if (isArray && typeof key === 'string' && !isNaN(Number(key))) {
          triggerProperty(target, 'length');
        }
      }

      // A brand-new key changes the iteration shape (Object.keys, spread,
      // for..in). Fire even if the value matches an old undefined slot,
      // since iteration sees the key, not the value.
      if (!hadKey) {
        triggerProperty(target, Symbol.iterator);
      }

      return result;
    },

    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (hadKey) {
        triggerProperty(target, key);
        // Removing a key changes iteration shape too.
        triggerProperty(target, Symbol.iterator);
      }
      return result;
    },

    has(target, key) {
      trackProperty(target, key);
      return Reflect.has(target, key);
    },

    ownKeys(target) {
      // Track iteration - anyone iterating should re-run when keys change
      trackProperty(target, Symbol.iterator);
      return Reflect.ownKeys(target);
    },
  });

  proxyCache.set(target, proxy);
  return proxy as T;
}

/**
 * Create a deeply reactive proxy around an object or array.
 * Reads are tracked, writes trigger subscribers.
 *
 * Usage:
 *   const state = reactive({ count: 0, items: ['a'] });
 *   state.count++;          // triggers effects reading state.count
 *   state.items.push('b');  // triggers effects reading state.items
 */
export function reactive<T extends object>(target: T): T {
  if ((target as any)[REACTIVE_BRAND]) {
    return target; // Already reactive
  }
  return createProxy(target);
}

/**
 * Get the raw (non-reactive) underlying object from a reactive proxy.
 */
export function toRaw<T extends object>(proxy: T): T {
  return (proxy as any)[RAW_SYMBOL] ?? proxy;
}

export function isReactive(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as any)[REACTIVE_BRAND] === true
  );
}
