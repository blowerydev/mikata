/**
 * Reactive — deep Proxy wrapper for objects and arrays.
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
        return function (this: any, ...args: any[]) {
          const result = (value as Function).apply(target, args);
          // Trigger length and the array itself
          triggerProperty(target, 'length');
          triggerProperty(target, key);
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

      return result;
    },

    deleteProperty(target, key) {
      const hadKey = key in target;
      const result = Reflect.deleteProperty(target, key);
      if (hadKey) {
        triggerProperty(target, key);
      }
      return result;
    },

    has(target, key) {
      trackProperty(target, key);
      return Reflect.has(target, key);
    },

    ownKeys(target) {
      // Track iteration — anyone iterating should re-run when keys change
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
