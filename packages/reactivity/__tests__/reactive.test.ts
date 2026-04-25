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

describe('reactive arrays - reordering mutators invalidate index subscriptions', () => {
  it('shift() invalidates index subscribers when values move down', () => {
    const state = reactive({ items: ['a', 'b', 'c'] });
    const seen: string[] = [];

    effect(() => {
      seen.push(state.items[0]!);
    });

    expect(seen).toEqual(['a']);

    state.items.shift();
    flushSync();
    expect(seen).toEqual(['a', 'b']);

    state.items.shift();
    flushSync();
    expect(seen).toEqual(['a', 'b', 'c']);
  });

  it('unshift() invalidates index subscribers when values move up', () => {
    const state = reactive({ items: ['b', 'c'] });
    const at0: (string | undefined)[] = [];
    const at1: (string | undefined)[] = [];

    effect(() => { at0.push(state.items[0]); });
    effect(() => { at1.push(state.items[1]); });

    expect(at0).toEqual(['b']);
    expect(at1).toEqual(['c']);

    state.items.unshift('a');
    flushSync();
    expect(at0).toEqual(['b', 'a']);
    expect(at1).toEqual(['c', 'b']);
  });

  it('splice() invalidates indices for replaced and shifted segments', () => {
    const state = reactive({ items: ['a', 'b', 'c', 'd'] });
    const at1: (string | undefined)[] = [];
    const at3: (string | undefined)[] = [];

    effect(() => { at1.push(state.items[1]); });
    effect(() => { at3.push(state.items[3]); });

    expect(at1).toEqual(['b']);
    expect(at3).toEqual(['d']);

    // Replace 'b','c' with single 'X' - index 1 changes, index 3 disappears.
    state.items.splice(1, 2, 'X');
    flushSync();
    expect(at1).toEqual(['b', 'X']);
    expect(at3).toEqual(['d', undefined]);
  });

  it('sort() re-fires subscribers after order changes', () => {
    const state = reactive({ items: [3, 1, 2] });
    const at0: number[] = [];

    effect(() => { at0.push(state.items[0]!); });

    expect(at0).toEqual([3]);

    state.items.sort((a, b) => a - b);
    flushSync();
    expect(at0).toEqual([3, 1]);
  });

  it('reverse() re-fires subscribers after order flips', () => {
    const state = reactive({ items: ['a', 'b', 'c'] });
    const at0: string[] = [];
    const at2: string[] = [];

    effect(() => { at0.push(state.items[0]!); });
    effect(() => { at2.push(state.items[2]!); });

    state.items.reverse();
    flushSync();
    expect(at0).toEqual(['a', 'c']);
    expect(at2).toEqual(['c', 'a']);
  });

  it('push() invalidates the new tail index without disturbing earlier ones', () => {
    const state = reactive({ items: ['a'] });
    const at0Fn = vi.fn(() => state.items[0]);
    const at1: (string | undefined)[] = [];

    effect(at0Fn);
    effect(() => { at1.push(state.items[1]); });

    expect(at0Fn).toHaveBeenCalledTimes(1);
    expect(at1).toEqual([undefined]);

    state.items.push('b');
    flushSync();
    // at[0] effect should NOT re-run - push doesn't reorder.
    expect(at0Fn).toHaveBeenCalledTimes(1);
    expect(at1).toEqual([undefined, 'b']);
  });
});

describe('reactive iteration - tracks key add/delete', () => {
  it('Object.keys() effect re-runs when a new key is added', () => {
    const state = reactive({ a: 1 } as Record<string, number>);
    const keys: string[][] = [];

    effect(() => {
      keys.push(Object.keys(state));
    });

    expect(keys).toEqual([['a']]);

    state.b = 2;
    flushSync();
    expect(keys).toEqual([['a'], ['a', 'b']]);
  });

  it('Object.keys() effect re-runs when a key is deleted', () => {
    const state = reactive({ a: 1, b: 2 } as Record<string, number>);
    const keys: string[][] = [];

    effect(() => {
      keys.push(Object.keys(state));
    });

    expect(keys).toEqual([['a', 'b']]);

    delete state.a;
    flushSync();
    expect(keys).toEqual([['a', 'b'], ['b']]);
  });

  it('spread re-runs when keys change', () => {
    const state = reactive({ a: 1 } as Record<string, number>);
    const snapshots: Record<string, number>[] = [];

    effect(() => {
      snapshots.push({ ...state });
    });

    expect(snapshots).toEqual([{ a: 1 }]);

    state.b = 2;
    flushSync();
    expect(snapshots).toEqual([{ a: 1 }, { a: 1, b: 2 }]);
  });

  it('iteration tracking does not re-fire on plain value updates', () => {
    const state = reactive({ a: 1 } as Record<string, number>);
    const fn = vi.fn(() => Object.keys(state));

    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    // Updating an existing key keeps the key set identical - iteration
    // consumers should NOT re-run.
    state.a = 2;
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('array iteration re-runs after structural mutation', () => {
    const state = reactive({ items: ['a', 'b'] });
    const lengths: number[] = [];

    effect(() => {
      lengths.push([...state.items].length);
    });

    expect(lengths).toEqual([2]);

    state.items.push('c');
    flushSync();
    expect(lengths).toEqual([2, 3]);
  });
});
