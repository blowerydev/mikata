import { describe, it, expect } from 'vitest';
import {
  whenStylesheetsReady,
  whenLoad,
  whenIdle,
  resolveDefer,
} from '../src/defer';

// @ts-expect-error - define __DEV__ for tests
globalThis.__DEV__ = true;

describe('defer helpers', () => {
  it('whenStylesheetsReady resolves immediately when no <link rel="stylesheet"> is present', async () => {
    document.head.innerHTML = '';
    await expect(whenStylesheetsReady()).resolves.toBeUndefined();
  });

  it('whenStylesheetsReady resolves immediately for already-loaded sheets', async () => {
    document.head.innerHTML = '';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'data:text/css,';
    // Stub the parsed-stylesheet flag - jsdom never actually fetches.
    Object.defineProperty(link, 'sheet', {
      value: { cssRules: [] },
      configurable: true,
    });
    document.head.appendChild(link);
    await expect(whenStylesheetsReady()).resolves.toBeUndefined();
  });

  it('whenStylesheetsReady waits for a load event on pending sheets', async () => {
    document.head.innerHTML = '';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'data:text/css,';
    document.head.appendChild(link);

    let resolved = false;
    const promise = whenStylesheetsReady().then(() => {
      resolved = true;
    });

    // Microtask flush - still pending.
    await Promise.resolve();
    expect(resolved).toBe(false);

    link.dispatchEvent(new Event('load'));
    await promise;
    expect(resolved).toBe(true);
  });

  it('whenStylesheetsReady resolves on error too (broken sheet shouldn’t deadlock hydration)', async () => {
    document.head.innerHTML = '';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'data:text/css,';
    document.head.appendChild(link);

    const promise = whenStylesheetsReady();
    link.dispatchEvent(new Event('error'));
    await expect(promise).resolves.toBeUndefined();
  });

  it('whenLoad resolves immediately when document.readyState === "complete"', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      configurable: true,
    });
    await expect(whenLoad()).resolves.toBeUndefined();
  });

  it('whenIdle resolves via the timeout fallback even without requestIdleCallback', async () => {
    const original = (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback;
    delete (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback;
    try {
      await expect(whenIdle()).resolves.toBeUndefined();
    } finally {
      if (original !== undefined) {
        (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback = original;
      }
    }
  });

  it('resolveDefer dispatches strings to the matching helper', async () => {
    document.head.innerHTML = '';
    await expect(resolveDefer('css')).resolves.toBeUndefined();
    await expect(resolveDefer('load')).resolves.toBeUndefined();
    await expect(resolveDefer('idle')).resolves.toBeUndefined();
  });

  it('resolveDefer accepts a custom function strategy', async () => {
    let called = false;
    await resolveDefer(async () => {
      called = true;
    });
    expect(called).toBe(true);
  });
});
