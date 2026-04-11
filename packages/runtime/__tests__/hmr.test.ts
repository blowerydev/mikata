/**
 * Tests for the HMR (Hot Module Replacement) runtime.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _registerComponent, _hotReplace } from '../src/hmr';
import { _createComponent } from '../src/component';
import { signal, flushSync } from '@mikata/reactivity';

// @ts-expect-error — define __DEV__ for tests
globalThis.__DEV__ = true;

describe('HMR Runtime', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('_registerComponent returns a proxy that delegates to the component', () => {
    function Counter() {
      const el = document.createElement('div');
      el.textContent = 'Count: 0';
      return el;
    }

    const Proxy = _registerComponent('test::Counter', Counter);
    const node = _createComponent(Proxy as any, {});
    container.appendChild(node);

    expect(container.textContent).toBe('Count: 0');
  });

  it('_hotReplace swaps component instances in the DOM', async () => {
    function CounterV1() {
      const el = document.createElement('div');
      el.textContent = 'v1';
      return el;
    }

    const id = 'test::CounterSwap';
    const Proxy = _registerComponent(id, CounterV1);
    const node = _createComponent(Proxy as any, {});
    container.appendChild(node);

    expect(container.textContent).toBe('v1');

    // Wait for the microtask that captures parent reference
    await new Promise<void>((r) => queueMicrotask(r));

    // Hot replace with v2
    function CounterV2() {
      const el = document.createElement('div');
      el.textContent = 'v2';
      return el;
    }

    _hotReplace(id, CounterV2);

    expect(container.textContent).toBe('v2');
  });

  it('_hotReplace preserves DOM position among siblings', async () => {
    const before = document.createElement('span');
    before.textContent = 'before';
    const after = document.createElement('span');
    after.textContent = 'after';

    function CompV1() {
      const el = document.createElement('span');
      el.textContent = 'v1';
      return el;
    }

    const id = 'test::PositionComp';
    const Proxy = _registerComponent(id, CompV1);

    container.appendChild(before);
    const node = _createComponent(Proxy as any, {});
    container.appendChild(node);
    container.appendChild(after);

    expect(container.textContent).toBe('beforev1after');

    await new Promise<void>((r) => queueMicrotask(r));

    function CompV2() {
      const el = document.createElement('span');
      el.textContent = 'v2';
      return el;
    }

    _hotReplace(id, CompV2);

    expect(container.textContent).toBe('beforev2after');
  });

  it('_hotReplace passes props to the new component', async () => {
    function GreetV1(props: { name: string }) {
      const el = document.createElement('div');
      el.textContent = `Hello ${props.name} v1`;
      return el;
    }

    const id = 'test::GreetHMR';
    const Proxy = _registerComponent(id, GreetV1);
    const node = _createComponent(Proxy as any, { name: 'Alice' });
    container.appendChild(node);

    expect(container.textContent).toBe('Hello Alice v1');

    await new Promise<void>((r) => queueMicrotask(r));

    function GreetV2(props: { name: string }) {
      const el = document.createElement('div');
      el.textContent = `Hi ${props.name} v2`;
      return el;
    }

    _hotReplace(id, GreetV2);

    expect(container.textContent).toBe('Hi Alice v2');
  });

  it('_hotReplace handles errors gracefully in dev mode', async () => {
    function WorkingComp() {
      const el = document.createElement('div');
      el.textContent = 'works';
      return el;
    }

    const id = 'test::ErrorComp';
    const Proxy = _registerComponent(id, WorkingComp);
    const node = _createComponent(Proxy as any, {});
    container.appendChild(node);

    await new Promise<void>((r) => queueMicrotask(r));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BrokenComp() {
      throw new Error('component crashed');
    }

    _hotReplace(id, BrokenComp);

    // Should show error overlay, not crash
    expect(container.innerHTML).toContain('component crashed');
    expect(container.innerHTML).toContain('HMR');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('_hotReplace recovers after an error on next successful update', async () => {
    function CompV1() {
      const el = document.createElement('div');
      el.textContent = 'v1';
      return el;
    }

    const id = 'test::RecoverComp';
    const Proxy = _registerComponent(id, CompV1);
    const node = _createComponent(Proxy as any, {});
    container.appendChild(node);

    await new Promise<void>((r) => queueMicrotask(r));

    // Break it
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    _hotReplace(id, () => { throw new Error('broken'); });
    expect(container.innerHTML).toContain('broken');

    await new Promise<void>((r) => queueMicrotask(r));

    // Fix it
    function CompV3() {
      const el = document.createElement('div');
      el.textContent = 'v3 recovered';
      return el;
    }

    _hotReplace(id, CompV3);
    expect(container.textContent).toContain('v3 recovered');

    consoleSpy.mockRestore();
  });

  it('_registerComponent proxy has the original function name', () => {
    function MyComponent() {
      return document.createElement('div');
    }

    const Proxy = _registerComponent('test::Named', MyComponent);
    expect(Proxy.name).toBe('MyComponent');
  });

  it('multiple instances are all replaced on hot update', async () => {
    function ItemV1() {
      const el = document.createElement('span');
      el.textContent = '[v1]';
      return el;
    }

    const id = 'test::MultiInstance';
    const Proxy = _registerComponent(id, ItemV1);

    // Create 3 instances
    for (let i = 0; i < 3; i++) {
      const node = _createComponent(Proxy as any, {});
      container.appendChild(node);
    }

    expect(container.textContent).toBe('[v1][v1][v1]');

    await new Promise<void>((r) => queueMicrotask(r));

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    function ItemV2() {
      const el = document.createElement('span');
      el.textContent = '[v2]';
      return el;
    }

    _hotReplace(id, ItemV2);

    expect(container.textContent).toBe('[v2][v2][v2]');

    consoleSpy.mockRestore();
  });
});
