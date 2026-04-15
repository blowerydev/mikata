/**
 * persistedSignal - a [read, write] tuple whose value is mirrored to a
 * Storage (localStorage/sessionStorage/IndexedDB) and synchronized across
 * tabs via BroadcastChannel.
 *
 * Shape matches `signal()` so consumers can `const [theme, setTheme] = ...`
 * and pass the getter anywhere a ReadSignal is expected.
 *
 * Cross-tab sync uses one BroadcastChannel per storage key, scoped with
 * `mikata:persist:` so it won't collide with user channels. We also listen
 * for the `storage` event as a fallback for browsers / environments where
 * BroadcastChannel is missing.
 */

import { signal, type ReadSignal, type WriteSignal } from '@mikata/reactivity';
import {
  localStorageAdapter,
  sessionStorageAdapter,
  type StorageAdapter,
} from './storage';

export interface PersistOptions<T> {
  /**
   * Where to persist. Strings select the built-in adapters; pass a custom
   * `StorageAdapter` for IndexedDB or app-specific stores.
   * Default: `'local'`.
   */
  storage?: 'local' | 'session' | StorageAdapter;
  /**
   * Mirror writes to other tabs. Default: `true` for `'local'`, `false` for
   * `'session'` (session storage is tab-scoped, sync would be surprising).
   */
  sync?: boolean;
  /** Custom serializer. Default: `JSON.stringify`. */
  serialize?: (value: T) => string;
  /** Custom deserializer. Default: `JSON.parse`. */
  deserialize?: (raw: string) => T;
  /**
   * Optional schema version. When set, serialized values are wrapped as
   * `{v,d}`. On read, if the stored version differs, `migrate` is called
   * with `(oldData, oldVersion)` and the result is rewritten.
   */
  version?: number;
  migrate?: (oldData: unknown, oldVersion: number | undefined) => T;
}

export interface PersistedSignal<T> {
  0: ReadSignal<T>;
  1: WriteSignal<T>;
  /** Resolves once the initial value has been loaded (meaningful for async adapters). */
  ready: Promise<void>;
  /** Remove the stored value, reset to `initialValue`, and notify other tabs. */
  clear(): void;
  /** Stop listening for cross-tab updates. */
  dispose(): void;
  /** Tuple destructuring support. */
  [Symbol.iterator](): IterableIterator<ReadSignal<T> | WriteSignal<T>>;
}

const CHANNEL_PREFIX = 'mikata:persist:';

function resolveAdapter(opt: PersistOptions<unknown>['storage']): StorageAdapter {
  if (!opt || opt === 'local') return localStorageAdapter;
  if (opt === 'session') return sessionStorageAdapter;
  return opt;
}

function resolveSync(opt: PersistOptions<unknown>): boolean {
  if (opt.sync !== undefined) return opt.sync;
  return opt.storage === undefined || opt.storage === 'local';
}

export function persistedSignal<T>(
  key: string,
  initialValue: T,
  options: PersistOptions<T> = {},
): PersistedSignal<T> {
  const adapter = resolveAdapter(options.storage);
  const sync = resolveSync(options as PersistOptions<unknown>);
  const serialize = options.serialize ?? JSON.stringify;
  const deserialize = (options.deserialize ?? JSON.parse) as (raw: string) => T;
  const version = options.version;
  const migrate = options.migrate;

  const [get, setRaw] = signal<T>(initialValue);

  function encode(value: T): string {
    return version !== undefined
      ? serialize({ v: version, d: value } as unknown as T)
      : serialize(value);
  }

  function decode(raw: string): T {
    if (version === undefined) return deserialize(raw);
    const parsed = JSON.parse(raw) as { v?: number; d?: unknown };
    if (parsed && typeof parsed === 'object' && 'v' in parsed && 'd' in parsed) {
      if (parsed.v === version) return parsed.d as T;
      return migrate ? migrate(parsed.d, parsed.v) : initialValue;
    }
    // Unversioned legacy value.
    return migrate ? migrate(parsed, undefined) : initialValue;
  }

  // When receiving cross-tab updates we must not echo them back out, or two
  // tabs will ping-pong forever. `applyingRemote` gates the write path.
  let applyingRemote = false;

  function applyRemote(value: T): void {
    applyingRemote = true;
    try {
      setRaw(value);
    } finally {
      applyingRemote = false;
    }
  }

  // --- Cross-tab plumbing -------------------------------------------------

  let channel: BroadcastChannel | null = null;
  let storageListener: ((e: StorageEvent) => void) | null = null;

  if (sync && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_PREFIX + key);
    channel.onmessage = (e) => {
      const data = e.data as { type: 'set'; raw: string | null } | undefined;
      if (!data) return;
      if (data.type === 'set') {
        applyRemote(data.raw === null ? initialValue : safeDecode(data.raw));
      }
    };
  } else if (sync && adapter === localStorageAdapter && typeof window !== 'undefined') {
    // Fallback for environments without BroadcastChannel — only works for
    // localStorage (sessionStorage doesn't fire cross-tab `storage` events).
    storageListener = (e) => {
      if (e.key !== key || e.storageArea !== (globalThis as { localStorage?: Storage }).localStorage) {
        return;
      }
      applyRemote(e.newValue === null ? initialValue : safeDecode(e.newValue));
    };
    window.addEventListener('storage', storageListener);
  }

  function safeDecode(raw: string): T {
    try {
      return decode(raw);
    } catch {
      return initialValue;
    }
  }

  // --- Initial load -------------------------------------------------------

  const rawOrPromise = adapter.getItem(key);
  const ready: Promise<void> =
    rawOrPromise && typeof (rawOrPromise as Promise<unknown>).then === 'function'
      ? (rawOrPromise as Promise<string | null>).then((raw) => {
          if (raw !== null) applyRemote(safeDecode(raw));
        })
      : (() => {
          const raw = rawOrPromise as string | null;
          if (raw !== null) applyRemote(safeDecode(raw));
          return Promise.resolve();
        })();

  // --- Write path ---------------------------------------------------------

  const set = ((next: T | ((prev: T) => T)) => {
    setRaw(next as T);
    if (applyingRemote) return;
    const current = get();
    const encoded = encode(current);
    const writeResult = adapter.setItem(key, encoded);
    if (writeResult && typeof (writeResult as Promise<unknown>).then === 'function') {
      (writeResult as Promise<unknown>).catch(() => {
        /* adapter already logged; swallow so set stays sync-looking */
      });
    }
    channel?.postMessage({ type: 'set', raw: encoded });
  }) as WriteSignal<T>;

  function clear(): void {
    const removeResult = adapter.removeItem(key);
    if (removeResult && typeof (removeResult as Promise<unknown>).then === 'function') {
      (removeResult as Promise<unknown>).catch(() => { /* ignore */ });
    }
    applyRemote(initialValue);
    channel?.postMessage({ type: 'set', raw: null });
  }

  function dispose(): void {
    channel?.close();
    channel = null;
    if (storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', storageListener);
    }
    storageListener = null;
  }

  const result = {
    0: get,
    1: set,
    ready,
    clear,
    dispose,
    *[Symbol.iterator]() {
      yield get;
      yield set;
    },
  } as PersistedSignal<T>;

  return result;
}
