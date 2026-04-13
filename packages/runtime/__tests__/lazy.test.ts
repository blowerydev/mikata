/**
 * Tests for lazy() - dynamic component loading.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lazy } from '../src/lazy';
import { _createComponent } from '../src/component';

// @ts-expect-error - define __DEV__ for tests
globalThis.__DEV__ = true;

describe('lazy()', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders the loaded component after import resolves', async () => {
    function Dashboard() {
      const el = document.createElement('div');
      el.textContent = 'Dashboard loaded';
      return el;
    }

    const LazyDashboard = lazy(() =>
      Promise.resolve({ default: Dashboard })
    );

    const node = _createComponent(LazyDashboard as any, {});
    container.appendChild(node);

    // Initially shows nothing visible (comment placeholder)
    expect(container.textContent).toBe('');

    // Wait for import to resolve
    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));

    expect(container.textContent).toBe('Dashboard loaded');
  });

  it('shows fallback while loading', async () => {
    let resolve!: (mod: any) => void;
    const importPromise = new Promise<any>((r) => { resolve = r; });

    function SlowComponent() {
      const el = document.createElement('div');
      el.textContent = 'Loaded';
      return el;
    }

    const LazyComp = lazy(
      () => importPromise,
      { fallback: () => {
        const el = document.createElement('span');
        el.textContent = 'Loading...';
        return el;
      }}
    );

    const node = _createComponent(LazyComp as any, {});
    container.appendChild(node);

    // Should show fallback
    expect(container.textContent).toBe('Loading...');

    // Resolve the import
    resolve({ default: SlowComponent });
    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));

    expect(container.textContent).toBe('Loaded');
  });

  it('shows error fallback on import failure', async () => {
    const LazyComp = lazy(
      () => Promise.reject(new Error('Network error')),
      {
        error: (err, retry) => {
          const el = document.createElement('div');
          el.textContent = `Error: ${err.message}`;
          return el;
        },
      }
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const node = _createComponent(LazyComp as any, {});
    container.appendChild(node);

    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));

    expect(container.textContent).toBe('Error: Network error');

    consoleSpy.mockRestore();
  });

  it('supports retry after error', async () => {
    let attempts = 0;

    function GoodComponent() {
      const el = document.createElement('div');
      el.textContent = 'Success';
      return el;
    }

    const LazyComp = lazy(
      () => {
        attempts++;
        if (attempts === 1) {
          return Promise.reject(new Error('first try fails'));
        }
        return Promise.resolve({ default: GoodComponent });
      },
      {
        fallback: () => {
          const el = document.createElement('span');
          el.textContent = 'Loading...';
          return el;
        },
        error: (err, retry) => {
          const el = document.createElement('div');
          const btn = document.createElement('button');
          btn.textContent = 'Retry';
          btn.addEventListener('click', retry);
          el.appendChild(document.createTextNode(`Failed: ${err.message} `));
          el.appendChild(btn);
          return el;
        },
      }
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const node = _createComponent(LazyComp as any, {});
    container.appendChild(node);

    // Wait for first attempt to fail
    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));

    expect(container.textContent).toContain('Failed');
    expect(attempts).toBe(1);

    // Click retry
    const btn = container.querySelector('button')!;
    btn.click();

    // Should show loading again
    expect(container.textContent).toBe('Loading...');

    // Wait for second attempt to succeed
    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));

    expect(container.textContent).toBe('Success');
    expect(attempts).toBe(2);

    consoleSpy.mockRestore();
  });

  it('passes props to the loaded component', async () => {
    function Greeting(props: { name: string }) {
      const el = document.createElement('div');
      el.textContent = `Hello ${props.name}`;
      return el;
    }

    const LazyGreeting = lazy(() =>
      Promise.resolve({ default: Greeting })
    );

    const node = _createComponent(LazyGreeting as any, { name: 'Alice' });
    container.appendChild(node);

    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));

    expect(container.textContent).toBe('Hello Alice');
  });

  it('renders immediately if already loaded (cached)', async () => {
    function Widget() {
      const el = document.createElement('div');
      el.textContent = 'Widget';
      return el;
    }

    const LazyWidget = lazy(() =>
      Promise.resolve({ default: Widget })
    );

    // First render - triggers load
    const node1 = _createComponent(LazyWidget as any, {});
    container.appendChild(node1);

    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));

    expect(container.textContent).toBe('Widget');

    // Second render - should be instant (no fallback flash)
    const container2 = document.createElement('div');
    document.body.appendChild(container2);
    const node2 = _createComponent(LazyWidget as any, {});
    container2.appendChild(node2);

    // Immediately has the component, no waiting needed
    expect(container2.textContent).toBe('Widget');

    container2.remove();
  });

  it('preload() starts loading without rendering', async () => {
    let loaded = false;

    function HeavyComponent() {
      loaded = true;
      const el = document.createElement('div');
      el.textContent = 'Heavy';
      return el;
    }

    const LazyHeavy = lazy(() =>
      Promise.resolve({ default: HeavyComponent })
    ) as any;

    // Preload - component function is loaded but not called
    await LazyHeavy.preload();
    expect(loaded).toBe(false); // Component not rendered yet

    // Now render - should be instant
    const node = _createComponent(LazyHeavy, {});
    container.appendChild(node);
    expect(container.textContent).toBe('Heavy');
    expect(loaded).toBe(true);
  });

  it('does not swap if component is removed before load completes', async () => {
    let resolve!: (mod: any) => void;
    const importPromise = new Promise<any>((r) => { resolve = r; });

    function Comp() {
      const el = document.createElement('div');
      el.textContent = 'Loaded';
      return el;
    }

    const LazyComp = lazy(() => importPromise);
    const node = _createComponent(LazyComp as any, {});
    container.appendChild(node);

    // Remove before load completes
    container.removeChild(node);

    // Resolve after removal
    resolve({ default: Comp });
    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));

    // Container should be empty - component was not inserted
    expect(container.textContent).toBe('');
  });

  it('has a descriptive name for devtools', () => {
    const LazyComp = lazy(function loadDashboard() {
      return Promise.resolve({ default: () => document.createElement('div') });
    });
    expect(LazyComp.name).toBe('Lazy(loadDashboard)');
  });
});
