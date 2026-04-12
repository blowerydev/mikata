import { describe, it, expect, vi } from 'vitest';
import { createAsyncDataController } from '../src/utils/async-data';

function nextTick(ms = 0): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('createAsyncDataController', () => {
  it('debounces calls and delivers only the latest result', async () => {
    const fetcher = vi
      .fn()
      .mockImplementation((q: string) => Promise.resolve([`${q}-a`, `${q}-b`]));
    const onResult = vi.fn();
    const onLoading = vi.fn();

    const ctrl = createAsyncDataController(fetcher, {
      debounceMs: 20,
      onLoading,
      onResult,
    });

    ctrl.request('a');
    ctrl.request('ab');
    ctrl.request('abc'); // only this should survive the debounce
    expect(fetcher).not.toHaveBeenCalled();

    await nextTick(40);
    await nextTick(0);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('abc');
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0]).toEqual(['abc-a', 'abc-b']);

    ctrl.dispose();
  });

  it('aborts prior in-flight fetches when a newer request lands', async () => {
    let firstAbortSignal: AbortSignal | null = null;
    const fetcher = vi.fn().mockImplementation((q: string, signal: AbortSignal) => {
      if (q === 'one') {
        firstAbortSignal = signal;
        return new Promise<string[]>((resolve) => {
          // Never resolves on its own — we'll check it gets aborted.
          signal.addEventListener('abort', () => resolve([]));
        });
      }
      return Promise.resolve([q]);
    });

    const onResult = vi.fn();
    const ctrl = createAsyncDataController(fetcher, {
      debounceMs: 0,
      onLoading: () => {},
      onResult,
    });

    ctrl.request('one');
    await nextTick(5);
    expect(fetcher).toHaveBeenCalledTimes(1);

    ctrl.request('two');
    await nextTick(5);

    // First fetch should have been aborted; onResult should only fire for 'two'.
    expect(firstAbortSignal?.aborted).toBe(true);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0]).toEqual(['two']);

    ctrl.dispose();
  });

  it('ignores results after dispose()', async () => {
    const fetcher = vi.fn().mockImplementation(async () => ['x']);
    const onResult = vi.fn();
    const ctrl = createAsyncDataController(fetcher, {
      debounceMs: 0,
      onLoading: () => {},
      onResult,
    });

    ctrl.request('a');
    ctrl.dispose();

    await nextTick(10);
    expect(onResult).not.toHaveBeenCalled();
  });

  it('flips onLoading around the fetch window', async () => {
    const loadingStates: boolean[] = [];
    const fetcher = vi.fn().mockImplementation(async () => {
      await nextTick(10);
      return ['done'];
    });

    const ctrl = createAsyncDataController(fetcher, {
      debounceMs: 0,
      onLoading: (l) => loadingStates.push(l),
      onResult: () => {},
    });

    ctrl.request('go');
    await nextTick(30);

    expect(loadingStates).toEqual([true, false]);
    ctrl.dispose();
  });
});
