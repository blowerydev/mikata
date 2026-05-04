import { describe, it, expect, vi } from 'vitest';
import { signal, subscribe, isSignal } from '../src/signal';
import { effect } from '../src/effect';
import { computed } from '../src/computed';
import { batch } from '../src/utils';
import { flushSync } from '../src/scheduler';

describe('signal', () => {
  it('returns a [getter, setter] tuple', () => {
    const [get, set] = signal(0);
    expect(typeof get).toBe('function');
    expect(typeof set).toBe('function');
  });

  it('getter returns the current value', () => {
    const [count] = signal(42);
    expect(count()).toBe(42);
  });

  it('setter updates the value', () => {
    const [count, setCount] = signal(0);
    setCount(5);
    expect(count()).toBe(5);
  });

  it('setter accepts an updater function', () => {
    const [count, setCount] = signal(10);
    setCount((prev) => prev + 5);
    expect(count()).toBe(15);
  });

  it('does not notify when value is unchanged (Object.is)', () => {
    const fn = vi.fn();
    const [count, setCount] = signal(0);
    effect(() => {
      count();
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    setCount(0); // same value
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1); // no re-run
  });

  it('handles NaN correctly (NaN === NaN via Object.is)', () => {
    const fn = vi.fn();
    const [val, setVal] = signal(NaN);
    effect(() => {
      val();
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    setVal(NaN);
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1); // NaN is Object.is-equal to NaN
  });

  it('works with various types', () => {
    const [str] = signal('hello');
    expect(str()).toBe('hello');

    const [bool] = signal(true);
    expect(bool()).toBe(true);

    const [obj] = signal({ x: 1 });
    expect(obj()).toEqual({ x: 1 });

    const [arr] = signal([1, 2, 3]);
    expect(arr()).toEqual([1, 2, 3]);

    const [nul] = signal(null);
    expect(nul()).toBe(null);
  });
});

describe('isSignal', () => {
  it('returns true for signal getters', () => {
    const [get] = signal(0);
    expect(isSignal(get)).toBe(true);
  });

  it('returns false for non-signals', () => {
    expect(isSignal(42)).toBe(false);
    expect(isSignal(() => 42)).toBe(false);
    expect(isSignal(null)).toBe(false);
    expect(isSignal(undefined)).toBe(false);
  });
});

describe('subscribe', () => {
  it('subscribes directly to signal values', () => {
    const values: number[] = [];
    const [count, setCount] = signal(0);
    const unsubscribe = subscribe(count, (value) => {
      values.push(value);
    });

    setCount(1);
    setCount(2);
    unsubscribe();
    setCount(3);

    expect(values).toEqual([0, 1, 2]);
  });

  it('requires a signal getter', () => {
    expect(() => subscribe((() => 1) as any, () => {})).toThrow(/signal getter/);
  });
});
