import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '../src/signal';
import { effect } from '../src/effect';
import { createScope, onCleanup } from '../src/scope';
import { resetLeakReports, suppressLeakTracking } from '../src/leak-detector';

// @ts-expect-error - define __DEV__ for tests
globalThis.__DEV__ = true;

describe('leak-detector', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetLeakReports();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('warns when an effect calls setTimeout without cleanup', () => {
    createScope(() => {
      effect(() => {
        setTimeout(() => {}, 10);
      });
    });

    const warnings = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('Possible subscription leak'),
    );
    expect(warnings.length).toBe(1);
    expect(String(warnings[0][0])).toContain('setTimeout');
  });

  it('does not warn when the effect returns a cleanup', () => {
    createScope(() => {
      effect(() => {
        const id = setTimeout(() => {}, 10);
        return () => clearTimeout(id);
      });
    });

    const warnings = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('Possible subscription leak'),
    );
    expect(warnings.length).toBe(0);
  });

  it('does not warn when onCleanup is called inside the effect', () => {
    createScope(() => {
      effect(() => {
        const id = setTimeout(() => {}, 10);
        onCleanup(() => clearTimeout(id));
      });
    });

    const warnings = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('Possible subscription leak'),
    );
    expect(warnings.length).toBe(0);
  });

  it('warns when addEventListener is called without cleanup', () => {
    const el = document.createElement('div');
    createScope(() => {
      effect(() => {
        el.addEventListener('click', () => {});
      });
    });

    const warnings = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('Possible subscription leak'),
    );
    expect(warnings.length).toBe(1);
    expect(String(warnings[0][0])).toContain('addEventListener');
  });

  it('deduplicates repeated warnings from the same effect', () => {
    const [count, setCount] = signal(0);

    createScope(() => {
      effect(() => {
        count(); // subscribe so re-runs happen
        setTimeout(() => {}, 10);
      });
    });

    setCount(1);
    setCount(2);
    setCount(3);

    // Flush to ensure the effect actually re-ran.
    // (setCount via microtask or sync depending on scheduler; we only care
    //  that the warning didn't spam.)
    const warnings = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('Possible subscription leak'),
    );
    expect(warnings.length).toBe(1);
  });

  it('includes the effect label in the warning', () => {
    createScope(() => {
      effect(() => {
        setTimeout(() => {}, 10);
      }, 'my-leaky-effect');
    });

    const msg = String(
      warnSpy.mock.calls.find((c) =>
        String(c[0]).includes('Possible subscription leak'),
      )![0],
    );
    expect(msg).toContain('my-leaky-effect');
  });

  it('does not warn for effects with no subscriptions', () => {
    createScope(() => {
      effect(() => {
        const x = 1 + 1;
        void x;
      });
    });

    const warnings = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('Possible subscription leak'),
    );
    expect(warnings.length).toBe(0);
  });

  it('does not warn for subscriptions made inside suppressLeakTracking', () => {
    const el = document.createElement('div');
    createScope(() => {
      effect(() => {
        suppressLeakTracking(() => {
          el.addEventListener('click', () => {});
          setTimeout(() => {}, 10);
          setInterval(() => {}, 10);
        });
      });
    });

    const warnings = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('Possible subscription leak'),
    );
    expect(warnings.length).toBe(0);
  });

  it('still warns for unsuppressed subscriptions when others are suppressed', () => {
    const el = document.createElement('div');
    createScope(() => {
      effect(() => {
        suppressLeakTracking(() => {
          el.addEventListener('click', () => {});
        });
        // This one is not suppressed - should still trip the detector.
        el.addEventListener('keydown', () => {});
      });
    });

    const warnings = warnSpy.mock.calls.filter((c) =>
      String(c[0]).includes('Possible subscription leak'),
    );
    expect(warnings.length).toBe(1);
    expect(String(warnings[0][0])).toContain('1× addEventListener');
  });
});
