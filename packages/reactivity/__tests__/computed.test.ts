import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/signal';
import { computed } from '../src/computed';
import { effect } from '../src/effect';
import { flushSync } from '../src/scheduler';

describe('computed', () => {
  it('computes a derived value', () => {
    const [count] = signal(5);
    const doubled = computed(() => count() * 2);
    expect(doubled()).toBe(10);
  });

  it('updates when dependencies change', () => {
    const [count, setCount] = signal(5);
    const doubled = computed(() => count() * 2);

    expect(doubled()).toBe(10);
    setCount(10);
    expect(doubled()).toBe(20);
  });

  it('is lazy — does not recompute until read', () => {
    const fn = vi.fn();
    const [count, setCount] = signal(0);

    const doubled = computed(() => {
      fn();
      return count() * 2;
    });

    expect(fn).not.toHaveBeenCalled(); // not computed yet

    doubled(); // first read triggers computation
    expect(fn).toHaveBeenCalledTimes(1);

    doubled(); // cached — no recomputation
    expect(fn).toHaveBeenCalledTimes(1);

    setCount(1); // mark dirty
    expect(fn).toHaveBeenCalledTimes(1); // still lazy

    doubled(); // read triggers recomputation
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('caches value when dependencies have not changed', () => {
    const fn = vi.fn();
    const [count] = signal(5);
    const doubled = computed(() => {
      fn();
      return count() * 2;
    });

    doubled();
    doubled();
    doubled();
    expect(fn).toHaveBeenCalledTimes(1); // computed only once
  });

  it('works in chains (computed of computed)', () => {
    const [count, setCount] = signal(2);
    const doubled = computed(() => count() * 2);
    const quadrupled = computed(() => doubled() * 2);

    expect(quadrupled()).toBe(8);
    setCount(3);
    expect(quadrupled()).toBe(12);
  });

  it('triggers effects that depend on it', () => {
    const [count, setCount] = signal(0);
    const doubled = computed(() => count() * 2);
    const values: number[] = [];

    effect(() => {
      values.push(doubled());
    });

    expect(values).toEqual([0]);

    setCount(5);
    flushSync();
    expect(values).toEqual([0, 10]);
  });

  it('does not trigger effects when computed value is unchanged', () => {
    const [count, setCount] = signal(0);
    const isPositive = computed(() => count() > 0);
    const fn = vi.fn();

    effect(() => {
      isPositive();
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    setCount(1); // isPositive changes: false -> true
    flushSync();
    expect(fn).toHaveBeenCalledTimes(2);

    setCount(2); // isPositive unchanged: true -> true
    flushSync();
    expect(fn).toHaveBeenCalledTimes(2); // no re-run
  });

  it('handles diamond dependency (A depends on B and C, both depend on D)', () => {
    const [source, setSource] = signal(1);
    const left = computed(() => source() * 2);
    const right = computed(() => source() * 3);
    const combined = computed(() => left() + right());
    const fn = vi.fn();

    effect(() => {
      combined();
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(combined()).toBe(5); // 2 + 3

    setSource(2);
    flushSync();
    expect(combined()).toBe(10); // 4 + 6
    expect(fn).toHaveBeenCalledTimes(2); // only once, not twice
  });
});
