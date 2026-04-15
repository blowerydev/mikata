import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScope } from '@mikata/reactivity';
import {
  useEventListener,
  useInterval,
  useTimeout,
  useSubscription,
  useResizeObserver,
  useMutationObserver,
  useIntersectionObserver,
} from '../src/hooks';

describe('useEventListener', () => {
  it('attaches and removes on scope dispose', () => {
    const el = document.createElement('div');
    const handler = vi.fn();
    const scope = createScope(() => {
      useEventListener(el, 'click', handler);
    });

    el.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);

    scope.dispose();
    el.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('forwards options and respects capture on teardown', () => {
    const el = document.createElement('div');
    const addSpy = vi.spyOn(el, 'addEventListener');
    const removeSpy = vi.spyOn(el, 'removeEventListener');
    const handler = vi.fn();

    const scope = createScope(() => {
      useEventListener(el, 'click', handler, { capture: true });
    });

    expect(addSpy).toHaveBeenCalledWith('click', handler, { capture: true });
    scope.dispose();
    expect(removeSpy).toHaveBeenCalledWith('click', handler, { capture: true });
  });
});

describe('useInterval', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires on the interval and clears on dispose', () => {
    const tick = vi.fn();
    const scope = createScope(() => {
      useInterval(tick, 100);
    });
    vi.advanceTimersByTime(250);
    expect(tick).toHaveBeenCalledTimes(2);

    scope.dispose();
    vi.advanceTimersByTime(500);
    expect(tick).toHaveBeenCalledTimes(2);
  });
});

describe('useTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires once and is cancellable via dispose', () => {
    const ran = vi.fn();
    const scope = createScope(() => {
      useTimeout(ran, 100);
    });
    vi.advanceTimersByTime(50);
    scope.dispose();
    vi.advanceTimersByTime(200);
    expect(ran).not.toHaveBeenCalled();
  });

  it('runs when not disposed', () => {
    const ran = vi.fn();
    createScope(() => {
      useTimeout(ran, 100);
    });
    vi.advanceTimersByTime(100);
    expect(ran).toHaveBeenCalledTimes(1);
  });
});

describe('useSubscription', () => {
  it('calls the returned unsubscribe on dispose', () => {
    const unsub = vi.fn();
    const sub = vi.fn(() => unsub);
    const scope = createScope(() => {
      useSubscription(sub);
    });
    expect(sub).toHaveBeenCalledTimes(1);
    expect(unsub).not.toHaveBeenCalled();
    scope.dispose();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});

describe('useResizeObserver', () => {
  it('observes the target and disconnects on dispose', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const Original = (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe = observe;
        disconnect = disconnect;
      };

    const el = document.createElement('div');
    const scope = createScope(() => {
      useResizeObserver(el, () => {});
    });
    expect(observe).toHaveBeenCalledWith(el, undefined);
    scope.dispose();
    expect(disconnect).toHaveBeenCalledTimes(1);

    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = Original;
  });

  it('accepts a lazy target getter', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const Original = (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe = observe;
        disconnect = disconnect;
      };

    const el = document.createElement('div');
    const scope = createScope(() => {
      useResizeObserver(() => el, () => {});
    });
    expect(observe).toHaveBeenCalledWith(el, undefined);
    scope.dispose();

    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = Original;
  });
});

describe('useMutationObserver', () => {
  it('observes and disconnects', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const Original = (globalThis as unknown as { MutationObserver: unknown }).MutationObserver;
    (globalThis as unknown as { MutationObserver: unknown }).MutationObserver =
      class {
        observe = observe;
        disconnect = disconnect;
      };

    const el = document.createElement('div');
    const scope = createScope(() => {
      useMutationObserver(el, () => {}, { childList: true });
    });
    expect(observe).toHaveBeenCalledWith(el, { childList: true });
    scope.dispose();
    expect(disconnect).toHaveBeenCalledTimes(1);

    (globalThis as unknown as { MutationObserver: unknown }).MutationObserver = Original;
  });
});

describe('useIntersectionObserver', () => {
  it('observes and disconnects', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const Original = (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver;
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      class {
        observe = observe;
        disconnect = disconnect;
      };

    const el = document.createElement('div');
    const scope = createScope(() => {
      useIntersectionObserver(el, () => {});
    });
    expect(observe).toHaveBeenCalledWith(el);
    scope.dispose();
    expect(disconnect).toHaveBeenCalledTimes(1);

    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = Original;
  });
});
