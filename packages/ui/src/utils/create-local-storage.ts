import { signal, type Signal } from '@mikata/reactivity';

/**
 * Signal backed by localStorage. Persists across page reloads.
 *
 * Usage:
 *   const [value, setValue] = createLocalStorage('my-key', 'default');
 */
export function createLocalStorage<T>(
  key: string,
  defaultValue: T
): Signal<T> {
  let initial = defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      initial = JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }

  const [get, rawSet] = signal<T>(initial);

  const set = ((valueOrUpdater: T | ((prev: T) => T)) => {
    if (typeof valueOrUpdater === 'function') {
      rawSet(valueOrUpdater as (prev: T) => T);
    } else {
      rawSet(valueOrUpdater);
    }
    try {
      localStorage.setItem(key, JSON.stringify(get()));
    } catch {
      // ignore quota errors
    }
  }) as typeof rawSet;

  return [get, set];
}

/** @deprecated Use `createLocalStorage` instead. */
export const useLocalStorage = createLocalStorage;
