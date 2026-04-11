import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/signal';
import { effect } from '../src/effect';
import { computed } from '../src/computed';
import { untrack, batch } from '../src/utils';
import { flushSync } from '../src/scheduler';
import { createScope, onCleanup } from '../src/scope';

describe('effect', () => {
  it('runs immediately on creation', () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-runs when a tracked signal changes', () => {
    const [count, setCount] = signal(0);
    const values: number[] = [];

    effect(() => {
      values.push(count());
    });

    expect(values).toEqual([0]);

    setCount(1);
    flushSync();
    expect(values).toEqual([0, 1]);

    setCount(2);
    flushSync();
    expect(values).toEqual([0, 1, 2]);
  });

  it('does not re-run when an untracked signal changes', () => {
    const [a, setA] = signal(0);
    const [b, setB] = signal(0);
    const fn = vi.fn();

    effect(() => {
      a(); // tracked
      untrack(() => b()); // not tracked
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    setB(1); // untracked — should not trigger
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1);

    setA(1); // tracked — should trigger
    flushSync();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('runs cleanup before re-execution', () => {
    const [count, setCount] = signal(0);
    const events: string[] = [];

    effect(() => {
      count();
      events.push('run');
      return () => events.push('cleanup');
    });

    expect(events).toEqual(['run']);

    setCount(1);
    flushSync();
    expect(events).toEqual(['run', 'cleanup', 'run']);
  });

  it('returns a dispose function', () => {
    const [count, setCount] = signal(0);
    const fn = vi.fn();

    const dispose = effect(() => {
      count();
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    dispose();
    setCount(1);
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1); // no re-run after dispose
  });

  it('runs cleanup on dispose', () => {
    const cleanup = vi.fn();
    const dispose = effect(() => cleanup);
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('handles dynamic dependencies (re-tracks on each run)', () => {
    const [branch, setBranch] = signal(true);
    const [a, setA] = signal('A');
    const [b, setB] = signal('B');
    const values: string[] = [];

    effect(() => {
      values.push(branch() ? a() : b());
    });

    expect(values).toEqual(['A']);

    // Changing b should NOT trigger (not tracked on first run)
    setB('B2');
    flushSync();
    expect(values).toEqual(['A']);

    // Switch branch — now b is tracked, a is not
    setBranch(false);
    flushSync();
    expect(values).toEqual(['A', 'B2']);

    // Now a should NOT trigger
    setA('A2');
    flushSync();
    expect(values).toEqual(['A', 'B2']);

    // But b should
    setB('B3');
    flushSync();
    expect(values).toEqual(['A', 'B2', 'B3']);
  });

  it('batches multiple signal writes', () => {
    const [a, setA] = signal(0);
    const [b, setB] = signal(0);
    const fn = vi.fn();

    effect(() => {
      a();
      b();
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      setA(1);
      setB(1);
    });
    flushSync();

    // Effect should only run once for both writes
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('scope', () => {
  it('disposes child effects when scope is disposed', () => {
    const [count, setCount] = signal(0);
    const fn = vi.fn();

    const scope = createScope(() => {
      effect(() => {
        count();
        fn();
      });
    });

    expect(fn).toHaveBeenCalledTimes(1);

    scope.dispose();

    setCount(1);
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1); // no re-run
  });

  it('runs onCleanup callbacks when scope is disposed', () => {
    const cleanup = vi.fn();

    const scope = createScope(() => {
      onCleanup(cleanup);
    });

    expect(cleanup).not.toHaveBeenCalled();
    scope.dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('disposes nested scopes', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const outer = createScope(() => {
      onCleanup(fn1);
      createScope(() => {
        onCleanup(fn2);
      });
    });

    outer.dispose();
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
