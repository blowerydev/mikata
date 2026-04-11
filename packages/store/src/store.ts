/**
 * createStore — higher-level reactive state management.
 *
 * Returns a read-only proxy + setState function.
 * Direct mutation throws in dev mode with a clear error message.
 */

import { reactive, batch } from '@mikata/reactivity';

declare const __DEV__: boolean;

export type SetStoreFunction<T extends object> = {
  (updater: Partial<T> | ((draft: T) => void)): void;
};

/**
 * Create a managed reactive store.
 *
 * Usage:
 *   const [store, setStore] = createStore({ count: 0, user: { name: 'Alice' } });
 *   setStore(s => { s.count++; });
 *   setStore({ count: 5 });
 */
export function createStore<T extends object>(
  initial: T
): [state: Readonly<T>, setState: SetStoreFunction<T>] {
  if (__DEV__) {
    if (initial === null || typeof initial !== 'object') {
      throw new Error(
        `[mikata] createStore() expects a plain object, got ${initial === null ? 'null' : typeof initial}.`
      );
    }
    if (Array.isArray(initial)) {
      console.warn(
        `[mikata] createStore() was called with an array. ` +
        `Consider wrapping it in an object: createStore({ items: [...] }).`
      );
    }
  }

  const internal = reactive(structuredClone(initial));

  // In dev mode, create a read-only proxy that warns on direct mutation
  const state = typeof __DEV__ !== 'undefined' && __DEV__
    ? new Proxy(internal, {
        set(_target, key) {
          console.error(
            `[mikata] Direct mutation of store property "${String(key)}" is not allowed. ` +
            `Use the setState function instead.`
          );
          return false;
        },
        deleteProperty(_target, key) {
          console.error(
            `[mikata] Direct deletion of store property "${String(key)}" is not allowed. ` +
            `Use the setState function instead.`
          );
          return false;
        },
      })
    : internal;

  function setState(updater: Partial<T> | ((draft: T) => void)): void {
    batch(() => {
      if (typeof updater === 'function') {
        (updater as (draft: T) => void)(internal);
      } else {
        const partial = updater as Partial<T>;
        for (const key of Object.keys(partial) as (keyof T)[]) {
          (internal as any)[key] = partial[key];
        }
      }
    });
  }

  return [state as Readonly<T>, setState];
}
