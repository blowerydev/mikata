import { describe, it, expect, vi } from 'vitest';
import { effect, flushSync, computed } from '@mikata/reactivity';
import { createStore, derived, createQuery, createMutation } from '../src/index';

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
