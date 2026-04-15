import { describe, it, expect, vi, beforeEach } from 'vitest';
import { effect, flushSync, computed, signal, createScope } from '@mikata/reactivity';
import {
  createStore,
  derived,
  createQuery,
  createMutation,
  createSelector,
  invalidateTag,
  invalidateTags,
} from '../src/index';
import { _resetTagRegistry } from '../src/query';

describe('createStore', () => {
  it('creates a reactive store', () => {
    const [store] = createStore({ count: 0 });
    expect(store.count).toBe(0);
  });

  it('setState with partial update', () => {
    const [store, setStore] = createStore({ count: 0, name: 'Alice' });
    setStore({ count: 5 });
    expect(store.count).toBe(5);
    expect(store.name).toBe('Alice');
  });

  it('setState with callback', () => {
    const [store, setStore] = createStore({ count: 0 });
    setStore((s) => {
      s.count = 10;
    });
    expect(store.count).toBe(10);
  });

  it('triggers effects on state change', () => {
    const [store, setStore] = createStore({ count: 0 });
    const values: number[] = [];

    effect(() => {
      values.push(store.count);
    });
    expect(values).toEqual([0]);

    setStore({ count: 1 });
    flushSync();
    expect(values).toEqual([0, 1]);
  });

  it('warns on direct mutation in dev mode', () => {
    const [store] = createStore({ count: 0 });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Direct mutation should throw (proxy returns false in strict mode)
    expect(() => {
      (store as any).count = 5;
    }).toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Direct mutation')
    );

    errorSpy.mockRestore();
  });

  it('does not modify the original object', () => {
    const original = { count: 0 };
    const [store, setStore] = createStore(original);
    setStore({ count: 5 });
    expect(original.count).toBe(0); // structuredClone
    expect(store.count).toBe(5);
  });
});

describe('derived', () => {
  it('derives a value from a store', () => {
    const [store, setStore] = createStore({ items: [1, 2, 3] });
    const total = derived(() => store.items.reduce((a: number, b: number) => a + b, 0));

    expect(total()).toBe(6);
  });
});

describe('createQuery', () => {
  it('fetches data and updates status', async () => {
    const mockFn = vi.fn().mockResolvedValue({ name: 'Alice' });

    const query = createQuery({
      key: () => 'user-1',
      fn: mockFn,
      retry: false,
    });

    expect(query.status()).toBe('loading');
    expect(query.data()).toBeUndefined();

    // Wait for the fetch to complete
    await vi.waitFor(() => {
      expect(query.status()).toBe('success');
    });

    expect(query.data()).toEqual({ name: 'Alice' });
    expect(query.error()).toBeNull();
  });

  it('handles errors', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Network error'));

    const query = createQuery({
      key: () => 'user-1',
      fn: mockFn,
      retry: false,
    });

    await vi.waitFor(() => {
      expect(query.status()).toBe('error');
    });

    expect(query.error()?.message).toBe('Network error');
    expect(query.data()).toBeUndefined();
  });

  it('runs fn exactly once per key change — does not refetch from its own setData', async () => {
    // Regression: execute() reads data() before its first await, so without
    // wrapping the call in untrack(), the key-watching effect would subscribe
    // to data and re-run every time setData fired — doubling every fetch and
    // making invalidation counts unpredictable.
    const fn = vi.fn().mockResolvedValue('hello');
    const query = createQuery({
      key: () => 'k',
      fn,
      retry: false,
    });
    await vi.waitFor(() => expect(query.status()).toBe('success'));
    // Give the scheduler one more tick to surface any stray re-runs.
    await new Promise((r) => setTimeout(r, 20));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when enabled is false', async () => {
    const mockFn = vi.fn().mockResolvedValue('data');

    createQuery({
      key: () => 'key',
      fn: mockFn,
      enabled: () => false,
    });

    // Wait a bit to ensure no fetch
    await new Promise((r) => setTimeout(r, 50));
    expect(mockFn).not.toHaveBeenCalled();
  });
});

describe('createMutation', () => {
  it('mutates and updates status', async () => {
    const onSuccess = vi.fn();
    const mutation = createMutation({
      fn: async (name: string) => ({ id: 1, name }),
      onSuccess,
    });

    expect(mutation.status()).toBe('idle');

    const result = await mutation.mutate('Alice');

    expect(result).toEqual({ id: 1, name: 'Alice' });
    expect(mutation.status()).toBe('success');
    expect(mutation.data()).toEqual({ id: 1, name: 'Alice' });
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'Alice' }, 'Alice');
  });

  it('handles mutation errors', async () => {
    const onError = vi.fn();
    const mutation = createMutation({
      fn: async () => {
        throw new Error('Failed');
      },
      onError,
    });

    await mutation.mutate(undefined);

    expect(mutation.status()).toBe('error');
    expect(mutation.error()?.message).toBe('Failed');
    expect(onError).toHaveBeenCalled();
  });

  it('resets state', async () => {
    const mutation = createMutation({
      fn: async (x: number) => x * 2,
    });

    await mutation.mutate(5);
    expect(mutation.status()).toBe('success');

    mutation.reset();
    expect(mutation.status()).toBe('idle');
    expect(mutation.data()).toBeUndefined();
  });
});

describe('invalidateTags', () => {
  beforeEach(() => {
    _resetTagRegistry();
  });

  it('a mutation invalidates a tagged query, triggering a refetch', async () => {
    const fetchUsers = vi.fn().mockResolvedValue(['alice']);
    const query = createQuery({
      key: () => 'users',
      fn: fetchUsers,
      tags: ['user'],
      retry: false,
    });
    await vi.waitFor(() => expect(query.status()).toBe('success'));
    expect(fetchUsers).toHaveBeenCalledTimes(1);

    const addUser = createMutation({
      fn: async (name: string) => ({ id: 1, name }),
      invalidates: ['user'],
    });
    await addUser.mutate('bob');

    await vi.waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(2));
  });

  it('deduplicates refetches when multiple overlapping tags match the same query', async () => {
    const fetchUser = vi.fn().mockResolvedValue({ id: 42 });
    const query = createQuery({
      key: () => 42,
      fn: fetchUser,
      tags: ['user', 'user:42'],
      retry: false,
    });
    await vi.waitFor(() => expect(query.status()).toBe('success'));
    expect(fetchUser).toHaveBeenCalledTimes(1);

    await invalidateTags(['user', 'user:42']);

    // Tagged twice, invalidated twice — but should only refetch ONCE.
    expect(fetchUser).toHaveBeenCalledTimes(2);
  });

  it('mutation invalidates derive tags from the result', async () => {
    const fetchUser = vi.fn().mockResolvedValue({ id: 7, name: 'Cara' });
    createQuery({
      key: () => 7,
      fn: fetchUser,
      tags: ['user:7'],
      retry: false,
    });
    await vi.waitFor(() => expect(fetchUser).toHaveBeenCalledTimes(1));

    const edit = createMutation({
      fn: async (patch: { id: number; name: string }) => patch,
      invalidates: (result) => [`user:${result.id}`],
    });
    await edit.mutate({ id: 7, name: 'Carol' });

    await vi.waitFor(() => expect(fetchUser).toHaveBeenCalledTimes(2));
  });

  it('standalone invalidateTag() refetches matching queries', async () => {
    const fetchAuth = vi.fn().mockResolvedValue({ role: 'admin' });
    createQuery({
      key: () => 'me',
      fn: fetchAuth,
      tags: ['auth'],
      retry: false,
    });
    await vi.waitFor(() => expect(fetchAuth).toHaveBeenCalledTimes(1));

    await invalidateTag('auth');
    expect(fetchAuth).toHaveBeenCalledTimes(2);
  });

  it('unrelated tags do not trigger refetches', async () => {
    const fetchUsers = vi.fn().mockResolvedValue([]);
    const fetchOrders = vi.fn().mockResolvedValue([]);
    createQuery({ key: () => 'u', fn: fetchUsers, tags: ['user'], retry: false });
    createQuery({ key: () => 'o', fn: fetchOrders, tags: ['order'], retry: false });
    await vi.waitFor(() => {
      expect(fetchUsers).toHaveBeenCalledTimes(1);
      expect(fetchOrders).toHaveBeenCalledTimes(1);
    });

    await invalidateTag('order');
    expect(fetchUsers).toHaveBeenCalledTimes(1);
    expect(fetchOrders).toHaveBeenCalledTimes(2);
  });

  it('queries unregister when their owning scope disposes', async () => {
    const fetchUsers = vi.fn().mockResolvedValue([]);
    const scope = createScope(() => {
      createQuery({
        key: () => 'u',
        fn: fetchUsers,
        tags: ['user'],
        retry: false,
      });
    });
    await vi.waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(1));

    scope.dispose();
    await invalidateTag('user');
    // Scope was disposed — the query should not have been refetched.
    expect(fetchUsers).toHaveBeenCalledTimes(1);
  });

  it('invalidating an unknown tag is a no-op and resolves', async () => {
    await expect(invalidateTag('nobody-tagged-this')).resolves.toBeUndefined();
  });
});

describe('createSelector', () => {
  it('only notifies the items whose selection state changed', () => {
    const [selected, setSelected] = signal(1);
    const isSelected = createSelector(() => selected());

    const runs: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const scope = createScope(() => {
      for (const id of [1, 2, 3]) {
        effect(() => {
          isSelected(id);
          runs[id]++;
        });
      }
    });

    expect(runs).toEqual({ 1: 1, 2: 1, 3: 1 });

    setSelected(2);
    flushSync();
    // Only items 1 (was selected) and 2 (now selected) should re-run
    expect(runs).toEqual({ 1: 2, 2: 2, 3: 1 });

    setSelected(3);
    flushSync();
    expect(runs).toEqual({ 1: 2, 2: 3, 3: 2 });

    scope.dispose();
  });

  it('prunes stale item signals when the reading scope disposes', () => {
    const [selected, setSelected] = signal(0);
    // Custom equals that counts how many entries the watcher iterates -
    // this reflects itemSignals.size each time the source changes.
    let equalsCalls = 0;
    const isSelected = createSelector<number, number>(
      () => selected(),
      (a, b) => {
        equalsCalls++;
        return a === b;
      }
    );

    // Register 500 items across 50 disposable scopes, then dispose them all.
    for (let round = 0; round < 50; round++) {
      const scope = createScope(() => {
        for (let id = round * 10; id < round * 10 + 10; id++) {
          effect(() => {
            isSelected(id);
          });
        }
      });
      scope.dispose();
    }

    // After disposing everything, the watching effect should have nothing
    // to iterate. Trigger a source change and measure equals calls.
    equalsCalls = 0;
    setSelected(1);
    flushSync();
    // O(1) per transition regardless of stale buckets - only the watcher's
    // prev/next guard compares, and notifyBucket walks per-key subscribers
    // (all empty after dispose).
    expect(equalsCalls).toBeLessThan(5);
  });

  it('reuses the signal while refs > 0, recreates after all refs drop', () => {
    const [selected, setSelected] = signal(1);
    const isSelected = createSelector(() => selected());

    const calls1: boolean[] = [];
    const scope1 = createScope(() => {
      effect(() => {
        calls1.push(isSelected(1));
      });
    });

    expect(calls1).toEqual([true]);

    setSelected(2);
    flushSync();
    expect(calls1).toEqual([true, false]);

    scope1.dispose();

    // After scope1 disposes, item 1's entry should be gone. Changing source
    // shouldn't keep notifying - verify by toggling back and seeing no throw
    // and that a new scope observing the same item starts fresh.
    setSelected(1);
    flushSync();

    const calls2: boolean[] = [];
    const scope2 = createScope(() => {
      effect(() => {
        calls2.push(isSelected(1));
      });
    });

    // Fresh entry should start from the current source value (1 → true)
    expect(calls2).toEqual([true]);

    setSelected(3);
    flushSync();
    expect(calls2).toEqual([true, false]);

    scope2.dispose();
  });
});
