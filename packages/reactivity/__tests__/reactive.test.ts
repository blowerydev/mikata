import { describe, it, expect, vi } from 'vitest';
import { reactive, isReactive, toRaw } from '../src/reactive';
import { effect } from '../src/effect';
import { computed } from '../src/computed';
import { flushSync } from '../src/scheduler';

describe('reactive', () => {
  it('creates a reactive proxy', () => {
    const state = reactive({ count: 0 });
    expect(state.count).toBe(0);
    expect(isReactive(state)).toBe(true);
  });

  it('tracks property reads and triggers on writes', () => {
    const state = reactive({ count: 0 });
    const values: number[] = [];

    effect(() => {
      values.push(state.count);
    });

    expect(values).toEqual([0]);

    state.count = 1;
    flushSync();
    expect(values).toEqual([0, 1]);

    state.count++;
    flushSync();
    expect(values).toEqual([0, 1, 2]);
  });

  it('does not trigger when value is unchanged', () => {
    const state = reactive({ count: 0 });
    const fn = vi.fn();

    effect(() => {
      state.count;
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    state.count = 0; // same value
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('tracks nested object properties', () => {
    const state = reactive({
      user: { name: 'Alice', age: 30 },
    });
    const names: string[] = [];

    effect(() => {
      names.push(state.user.name);
    });

    expect(names).toEqual(['Alice']);

    state.user.name = 'Bob';
    flushSync();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('tracks array mutations', () => {
    const state = reactive({ items: ['a', 'b'] });
    const fn = vi.fn();

    effect(() => {
      state.items.length; // track length
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    state.items.push('c');
    flushSync();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(state.items).toEqual(['a', 'b', 'c']);
  });

  it('tracks array index access', () => {
    const state = reactive({ items: ['a', 'b', 'c'] });
    const values: string[] = [];

    effect(() => {
      values.push(state.items[0]);
    });

    expect(values).toEqual(['a']);

    state.items[0] = 'x';
    flushSync();
    expect(values).toEqual(['a', 'x']);
  });

  it('tracks delete operations', () => {
    const state = reactive({ x: 1, y: 2 } as Record<string, number>);
    const fn = vi.fn();

    effect(() => {
      state.x;
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    delete state.x;
    flushSync();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(state.x).toBeUndefined();
  });

  it('works with computed', () => {
    const state = reactive({ a: 1, b: 2 });
    const sum = computed(() => state.a + state.b);

    expect(sum()).toBe(3);
    state.a = 10;
    expect(sum()).toBe(12);
  });

  it('returns same proxy for same object', () => {
    const raw = { count: 0 };
    const p1 = reactive(raw);
    const p2 = reactive(raw);
    expect(p1).toBe(p2);
  });

  it('returns the proxy if already reactive', () => {
    const state = reactive({ count: 0 });
    const again = reactive(state);
    expect(again).toBe(state);
  });

  it('toRaw returns the underlying object', () => {
    const raw = { count: 0 };
    const state = reactive(raw);
    expect(toRaw(state)).toBe(raw);
  });

  it('isReactive returns false for plain objects', () => {
    expect(isReactive({ x: 1 })).toBe(false);
    expect(isReactive(42)).toBe(false);
    expect(isReactive(null)).toBe(false);
  });
});
