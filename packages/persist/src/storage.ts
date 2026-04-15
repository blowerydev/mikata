/**
 * Storage adapters. All adapters expose the same `getItem/setItem/removeItem`
 * surface; `async` flags whether callers should await the initial read.
 *
 * `localStorage` / `sessionStorage` are synchronous and SSR-safe (they no-op
 * if the global is missing). IndexedDB is opt-in via `indexedDBStorage()`.
 */

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
  readonly async?: boolean;
}

function webStorageAdapter(getStore: () => Storage | undefined): StorageAdapter {
  return {
    getItem(key) {
      try {
        return getStore()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        getStore()?.setItem(key, value);
      } catch {
        // Quota exceeded, private-mode lockouts, etc. — swallow.
      }
    },
    removeItem(key) {
      try {
        getStore()?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

export const localStorageAdapter: StorageAdapter = webStorageAdapter(() =>
  typeof globalThis !== 'undefined' && 'localStorage' in globalThis
    ? (globalThis as { localStorage: Storage }).localStorage
    : undefined,
);

export const sessionStorageAdapter: StorageAdapter = webStorageAdapter(() =>
  typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis
    ? (globalThis as { sessionStorage: Storage }).sessionStorage
    : undefined,
);

interface IDBStorageOptions {
  dbName?: string;
  storeName?: string;
}

/**
 * IndexedDB-backed adapter. Reads return Promises; callers who care about the
 * initial value should `await` via the `ready` promise returned by
 * `persistedSignal`. Writes fire-and-forget — failures are logged in dev only.
 */
export function indexedDBStorage(options: IDBStorageOptions = {}): StorageAdapter {
  const dbName = options.dbName ?? 'mikata-persist';
  const storeName = options.storeName ?? 'kv';
  let dbPromise: Promise<IDBDatabase> | null = null;

  function getDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('[mikata/persist] indexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(storeName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return getDB().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const store = db.transaction(storeName, mode).objectStore(storeName);
          const req = fn(store);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        }),
    );
  }

  return {
    async: true,
    getItem: (key) =>
      tx<string | undefined>('readonly', (s) => s.get(key)).then((v) => v ?? null),
    setItem: (key, value) => tx('readwrite', (s) => s.put(value, key)).then(() => undefined),
    removeItem: (key) => tx('readwrite', (s) => s.delete(key)).then(() => undefined),
  };
}
