import { describe, it, expect, beforeEach, vi } from 'vitest';
import { effect, flushSync } from '@mikata/reactivity';
import {
  persistedSignal,
  localStorageAdapter,
  sessionStorageAdapter,
  type StorageAdapter,
} from '../src';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('persistedSignal - basics', () => {
  it('seeds from initialValue when storage is empty', () => {
    const [theme] = persistedSignal('theme', 'light');
    expect(theme()).toBe('light');
  });

  it('rehydrates from localStorage on creation', () => {
    localStorage.setItem('theme', JSON.stringify('dark'));
    const [theme] = persistedSignal('theme', 'light');
    expect(theme()).toBe('dark');
  });

  it('writes to localStorage on set', () => {
    const [, setTheme] = persistedSignal('theme', 'light');
    setTheme('dark');
    expect(localStorage.getItem('theme')).toBe(JSON.stringify('dark'));
  });

  it('is reactive — effects re-run when the signal changes', () => {
    const [count, setCount] = persistedSignal('count', 0);
    const seen: number[] = [];
    effect(() => {
      seen.push(count());
    });
    setCount(1);
    flushSync();
    setCount(2);
    flushSync();
    expect(seen).toEqual([0, 1, 2]);
  });

  it('accepts an updater function like signal()', () => {
    const [count, setCount] = persistedSignal('count', 10);
    setCount((n) => n + 5);
    expect(count()).toBe(15);
    expect(JSON.parse(localStorage.getItem('count')!)).toBe(15);
  });

  it('clear() removes storage and resets to initialValue', () => {
    const handle = persistedSignal('theme', 'light');
    handle[1]('dark');
    handle.clear();
    expect(handle[0]()).toBe('light');
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('falls back to initialValue when the stored JSON is corrupt', () => {
    localStorage.setItem('theme', '{not-json}');
    const [theme] = persistedSignal('theme', 'light');
    expect(theme()).toBe('light');
  });
});

describe('persistedSignal - storage selection', () => {
  it('uses sessionStorage when storage: "session"', () => {
    const [, set] = persistedSignal('draft', '', { storage: 'session' });
    set('typing...');
    expect(sessionStorage.getItem('draft')).toBe(JSON.stringify('typing...'));
    expect(localStorage.getItem('draft')).toBeNull();
  });

  it('accepts a custom StorageAdapter', () => {
    const mem = new Map<string, string>();
    const adapter: StorageAdapter = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k),
    };
    const [, set] = persistedSignal('k', 0, { storage: adapter, sync: false });
    set(42);
    expect(mem.get('k')).toBe('42');
  });
});

describe('persistedSignal - versioned migration', () => {
  it('wraps values with {v,d} when version is set', () => {
    const [, set] = persistedSignal('prefs', { size: 'md' }, { version: 2, sync: false });
    set({ size: 'lg' });
    const raw = JSON.parse(localStorage.getItem('prefs')!);
    expect(raw).toEqual({ v: 2, d: { size: 'lg' } });
  });

  it('migrates when the stored version differs', () => {
    // Old v1 shape: { fontSize: 'md' }
    localStorage.setItem('prefs', JSON.stringify({ v: 1, d: { fontSize: 'md' } }));
    const [prefs] = persistedSignal('prefs', { size: 'xs' }, {
      version: 2,
      migrate: (old: any) => ({ size: old.fontSize }),
    });
    expect(prefs()).toEqual({ size: 'md' });
  });

  it('migrates unversioned legacy values', () => {
    localStorage.setItem('prefs', JSON.stringify('md'));
    const migrate = vi.fn((old) => ({ size: old }));
    const [prefs] = persistedSignal('prefs', { size: 'xs' }, {
      version: 1,
      migrate,
    });
    expect(migrate).toHaveBeenCalledWith('md', undefined);
    expect(prefs()).toEqual({ size: 'md' });
  });
});

describe('persistedSignal - cross-tab sync', () => {
  it('receives updates from a BroadcastChannel message', async () => {
    const [theme] = persistedSignal('theme', 'light');
    const bc = new BroadcastChannel('mikata:persist:theme');
    bc.postMessage({ type: 'set', raw: JSON.stringify('dark') });
    // BroadcastChannel delivery is async in jsdom.
    await new Promise((r) => setTimeout(r, 0));
    expect(theme()).toBe('dark');
    bc.close();
  });

  it('does not echo its own writes back through the channel', async () => {
    const handle = persistedSignal('theme', 'light');
    const echoes: unknown[] = [];
    const bc = new BroadcastChannel('mikata:persist:theme');
    bc.onmessage = (e) => echoes.push(e.data);
    handle[1]('dark');
    await new Promise((r) => setTimeout(r, 0));
    // Exactly one broadcast, and it reflects the new value — not a re-echo.
    expect(echoes).toHaveLength(1);
    expect(echoes[0]).toMatchObject({ type: 'set', raw: JSON.stringify('dark') });
    bc.close();
    handle.dispose();
  });

  it('clear() broadcasts a null-raw message to reset peers', async () => {
    const handle = persistedSignal('theme', 'light');
    const received: unknown[] = [];
    const bc = new BroadcastChannel('mikata:persist:theme');
    bc.onmessage = (e) => received.push(e.data);
    handle[1]('dark');
    handle.clear();
    await new Promise((r) => setTimeout(r, 0));
    expect(received.at(-1)).toMatchObject({ type: 'set', raw: null });
    bc.close();
    handle.dispose();
  });

  it('dispose() stops receiving cross-tab messages', async () => {
    const handle = persistedSignal('theme', 'light');
    handle.dispose();
    const bc = new BroadcastChannel('mikata:persist:theme');
    bc.postMessage({ type: 'set', raw: JSON.stringify('dark') });
    await new Promise((r) => setTimeout(r, 0));
    expect(handle[0]()).toBe('light');
    bc.close();
  });

  it('session storage defaults sync off', async () => {
    const handle = persistedSignal('draft', '', { storage: 'session' });
    const received: unknown[] = [];
    const bc = new BroadcastChannel('mikata:persist:draft');
    bc.onmessage = (e) => received.push(e.data);
    handle[1]('typing');
    await new Promise((r) => setTimeout(r, 0));
    expect(received).toHaveLength(0);
    bc.close();
    handle.dispose();
  });
});

describe('persistedSignal - ready promise', () => {
  it('resolves immediately for sync adapters', async () => {
    const handle = persistedSignal('k', 0);
    await expect(handle.ready).resolves.toBeUndefined();
  });

  it('waits for async adapter hydration', async () => {
    let resolveGet!: (v: string | null) => void;
    const adapter: StorageAdapter = {
      async: true,
      getItem: () =>
        new Promise<string | null>((r) => {
          resolveGet = r;
        }),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
    const handle = persistedSignal('k', 0, { storage: adapter, sync: false });
    expect(handle[0]()).toBe(0);
    resolveGet(JSON.stringify(99));
    await handle.ready;
    expect(handle[0]()).toBe(99);
  });
});

describe('persistedSignal - adapter smoke', () => {
  it('localStorage adapter round-trips', () => {
    localStorageAdapter.setItem('x', 'y');
    expect(localStorageAdapter.getItem('x')).toBe('y');
    localStorageAdapter.removeItem('x');
    expect(localStorageAdapter.getItem('x')).toBeNull();
  });

  it('sessionStorage adapter round-trips', () => {
    sessionStorageAdapter.setItem('x', 'y');
    expect(sessionStorageAdapter.getItem('x')).toBe('y');
    sessionStorageAdapter.removeItem('x');
    expect(sessionStorageAdapter.getItem('x')).toBeNull();
  });
});
