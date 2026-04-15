/**
 * Tests for the devtools overlay and component tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../src/render';
import { _createComponent } from '../src/component';
import { installDevTools, parseStackFrames } from '../src/devtools';
import { signal, flushSync, _resetDebugRegistry } from '@mikata/reactivity';

// @ts-expect-error - define __DEV__ for tests
globalThis.__DEV__ = true;

describe('DevTools', () => {
  let container: HTMLElement;

  beforeEach(() => {
    _resetDebugRegistry();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    // Clean up overlay
    const overlay = document.getElementById('__mikata-devtools__');
    if (overlay) overlay.remove();
    delete (window as any).__MIKATA_DEVTOOLS__;
  });

  it('installs window.__MIKATA_DEVTOOLS__', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installDevTools({ overlay: false });
    expect((window as any).__MIKATA_DEVTOOLS__).toBeDefined();
    expect(typeof (window as any).__MIKATA_DEVTOOLS__.graph).toBe('function');
    expect(typeof (window as any).__MIKATA_DEVTOOLS__.stats).toBe('function');
    expect(typeof (window as any).__MIKATA_DEVTOOLS__.inspect).toBe('function');
    expect(typeof (window as any).__MIKATA_DEVTOOLS__.why).toBe('function');
    expect(typeof (window as any).__MIKATA_DEVTOOLS__.subscribers).toBe('function');
    expect(typeof (window as any).__MIKATA_DEVTOOLS__.components).toBe('function');
    consoleSpy.mockRestore();
  });

  it('graph() returns reactive node snapshots', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installDevTools({ overlay: false });

    const [count, setCount] = signal(0, 'test-count');
    const devtools = (window as any).__MIKATA_DEVTOOLS__;

    const graph = devtools.graph();
    expect(graph.signals.length).toBeGreaterThanOrEqual(1);

    const testSignal = graph.signals.find((s: any) => s.label === 'test-count');
    expect(testSignal).toBeDefined();
    expect(testSignal.value).toBe(0);

    consoleSpy.mockRestore();
  });

  it('stats() returns counts', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installDevTools({ overlay: false });

    signal(1, 'a');
    signal(2, 'b');

    const devtools = (window as any).__MIKATA_DEVTOOLS__;
    const stats = devtools.stats();
    expect(stats.signals).toBeGreaterThanOrEqual(2);

    consoleSpy.mockRestore();
  });

  it('components() tracks mounted components', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installDevTools({ overlay: false });

    function TestComponent() {
      const el = document.createElement('div');
      el.textContent = 'hello';
      return el;
    }

    const node = _createComponent(TestComponent as any, {});
    container.appendChild(node);

    const devtools = (window as any).__MIKATA_DEVTOOLS__;
    const components = devtools.components();
    expect(components.length).toBeGreaterThanOrEqual(1);

    const testComp = components.find((c: any) => c.name === 'TestComponent');
    expect(testComp).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('show() renders the overlay in the DOM', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installDevTools();

    const devtools = (window as any).__MIKATA_DEVTOOLS__;
    devtools.show();

    const overlay = document.getElementById('__mikata-devtools__');
    expect(overlay).toBeTruthy();
    expect(overlay!.textContent).toContain('Mikata DevTools');
    expect(overlay!.textContent).toContain('Signals');
    expect(overlay!.textContent).toContain('Effects');

    devtools.hide();
    expect(document.getElementById('__mikata-devtools__')).toBeNull();

    consoleSpy.mockRestore();
  });

  it('toggle() shows and hides', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installDevTools();

    const devtools = (window as any).__MIKATA_DEVTOOLS__;
    devtools.toggle();
    expect(document.getElementById('__mikata-devtools__')).toBeTruthy();

    devtools.toggle();
    expect(document.getElementById('__mikata-devtools__')).toBeNull();

    consoleSpy.mockRestore();
  });

  it('overlay displays stats', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installDevTools();

    signal(10, 'counter');
    signal('hello', 'message');

    const devtools = (window as any).__MIKATA_DEVTOOLS__;
    devtools.show();

    const overlay = document.getElementById('__mikata-devtools__');
    // The overview tab should show signal counts
    expect(overlay!.textContent).toContain('Signals');

    devtools.hide();
    consoleSpy.mockRestore();
  });

  it('search() finds nodes by label', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installDevTools({ overlay: false });

    signal(0, 'user-count');
    signal('', 'user-name');
    signal(0, 'cart-total');

    const devtools = (window as any).__MIKATA_DEVTOOLS__;
    const results = devtools.search('user');
    expect(results.length).toBe(2);

    consoleSpy.mockRestore();
  });

  it('parseStackFrames extracts file/line/col from common formats', () => {
    const chromeStack = [
      '    at createSignal (http://localhost:5173/src/signal.ts:12:7)',
      '    at App (http://localhost:5173/src/App.tsx:42:19)',
      '    at <anonymous>',
    ].join('\n');
    const chromeFrames = parseStackFrames(chromeStack);
    expect(chromeFrames).toHaveLength(3);
    expect(chromeFrames[0]).toMatchObject({
      file: 'http://localhost:5173/src/signal.ts',
      line: 12,
      column: 7,
    });
    expect(chromeFrames[1]).toMatchObject({
      file: 'http://localhost:5173/src/App.tsx',
      line: 42,
      column: 19,
    });
    expect(chromeFrames[2].file).toBeNull();

    const firefoxStack = 'makeSignal@http://localhost:5173/src/signal.ts:12:7';
    const ffFrames = parseStackFrames(firefoxStack);
    expect(ffFrames[0]).toMatchObject({
      file: 'http://localhost:5173/src/signal.ts',
      line: 12,
      column: 7,
    });
  });

  it('renders clickable frames for the created stack in the overlay', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installDevTools();

    signal(42, 'frame-test-signal');

    const devtools = (window as any).__MIKATA_DEVTOOLS__;
    devtools.show();

    const overlay = document.getElementById('__mikata-devtools__')!;
    // Switch to signals tab
    const signalsTab = overlay.querySelector<HTMLElement>('.__mdt-tab[data-tab="signals"]');
    signalsTab!.click();

    // Expand our signal
    const rows = overlay.querySelectorAll<HTMLElement>('.__mdt-node');
    const target = Array.from(rows).find((r) =>
      r.textContent?.includes('frame-test-signal')
    );
    expect(target).toBeDefined();
    target!.click();

    // After expansion, the detail should contain at least one clickable frame.
    const frames = overlay.querySelectorAll<HTMLElement>('.__mdt-frame[data-frame]');
    expect(frames.length).toBeGreaterThan(0);
    const first = frames[0];
    expect(first.getAttribute('title')).toMatch(/:\d+:\d+$/);

    devtools.hide();
    consoleSpy.mockRestore();
  });

  it('auto-installs on render() in dev mode', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const dispose = render(
      () => {
        const el = document.createElement('div');
        el.textContent = 'app';
        return el;
      },
      container
    );

    expect((window as any).__MIKATA_DEVTOOLS__).toBeDefined();

    dispose();
    consoleSpy.mockRestore();
  });
});
