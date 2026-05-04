import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/signal';
import { effect, renderEffect } from '../src/effect';
import { computed } from '../src/computed';
import { untrack, batch } from '../src/utils';
import { flushSync } from '../src/scheduler';
import { createScope, onCleanup } from '../src/scope';
import { reactive } from '../src/reactive';

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

    setB(1); // untracked - should not trigger
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1);

    setA(1); // tracked - should trigger
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

  it('does not run a queued effect after it is disposed', () => {
    const [count, setCount] = signal(0);
    const fn = vi.fn();

    const dispose = effect(() => {
      count();
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    setCount(1);
    dispose();
    flushSync();
    expect(fn).toHaveBeenCalledTimes(1);
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

    // Switch branch - now b is tracked, a is not
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

describe('renderEffect priority', () => {
  it('renderEffect flushes before user effect on signal change', () => {
    const [count, setCount] = signal(0);
    const order: string[] = [];

    // Create user effect FIRST, render effect SECOND - if priority is
    // ignored we'd see ['user', 'render'] (insertion order). Priority
    // ordering must give us ['render', 'user'].
    effect(() => {
      count();
      if (count() > 0) order.push('user');
    });
    renderEffect(() => {
      count();
      if (count() > 0) order.push('render');
    });

    setCount(1);
    flushSync();
    expect(order).toEqual(['render', 'user']);
  });

  it('renderEffect priority survives propagation through a computed', () => {
    const [n, setN] = signal(0);
    const doubled = computed(() => n() * 2);
    const order: string[] = [];

    effect(() => {
      doubled();
      if (n() > 0) order.push('user');
    });
    renderEffect(() => {
      doubled();
      if (n() > 0) order.push('render');
    });

    setN(1);
    flushSync();
    expect(order).toEqual(['render', 'user']);
  });

  it('renderEffect priority applies when triggered through a reactive proxy', () => {
    const state = reactive({ count: 0 });
    const order: string[] = [];

    effect(() => {
      state.count;
      if (state.count > 0) order.push('user');
    });
    renderEffect(() => {
      state.count;
      if (state.count > 0) order.push('render');
    });

    state.count = 1;
    flushSync();
    expect(order).toEqual(['render', 'user']);
  });

  it('multiple render effects all flush before any user effect', () => {
    const [n, setN] = signal(0);
    const order: string[] = [];

    effect(() => {
      n();
      if (n() > 0) order.push('user-1');
    });
    renderEffect(() => {
      n();
      if (n() > 0) order.push('render-1');
    });
    effect(() => {
      n();
      if (n() > 0) order.push('user-2');
    });
    renderEffect(() => {
      n();
      if (n() > 0) order.push('render-2');
    });

    setN(1);
    flushSync();
    // Render effects run as a group before user effects; insertion
    // order is preserved within each group.
    expect(order).toEqual(['render-1', 'render-2', 'user-1', 'user-2']);
  });

  it('transitively queued render effects still flush before pending user effects', () => {
    const [a, setA] = signal(0);
    const [b, setB] = signal(0);
    const order: string[] = [];

    renderEffect(() => {
      if (a() > 0) {
        order.push('render-a');
        // Queue another render effect mid-flush.
        if (b() === 0) setB(1);
      }
    });

    effect(() => {
      if (a() > 0) order.push('user-a');
    });

    renderEffect(() => {
      if (b() > 0) order.push('render-b');
    });

    setA(1);
    flushSync();
    expect(order).toEqual(['render-a', 'render-b', 'user-a']);
  });

  it('does not warn for many distinct effects in one flush', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const [value, setValue] = signal(0);
    const runs: number[] = [];

    for (let i = 0; i < 120; i++) {
      renderEffect(() => {
        value();
        runs[i] = (runs[i] ?? 0) + 1;
      });
    }

    setValue(1);
    flushSync();

    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Unusually high number of'),
    );
    expect(runs.every((run) => run === 2)).toBe(true);
    warn.mockRestore();
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

  it('warns when onCleanup is called outside a reactive scope', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    onCleanup(() => {});

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('onCleanup() was called outside a reactive scope'),
    );
    warn.mockRestore();
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
