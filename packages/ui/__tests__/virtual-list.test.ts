import { describe, it, expect, beforeEach } from 'vitest';
import { createScope, flushSync } from '@mikata/reactivity';
import { VirtualList, createVirtualizer } from '../src/components/VirtualList';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createVirtualizer', () => {
  function makeScrollHost(size = 200): HTMLElement {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', { value: size, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: size, configurable: true });
    Object.defineProperty(el, 'scrollTop', { value: 0, writable: true, configurable: true });
    Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true, configurable: true });
    document.body.appendChild(el);
    return el;
  }

  it('computes total size for fixed items', () => {
    createScope(() => {
      const host = makeScrollHost();
      const v = createVirtualizer({
        count: 1000,
        itemSize: 40,
        scrollElement: host,
      });
      flushSync();
      expect(v.totalSize()).toBe(40000);
    });
  });

  it('only virtualizes items within view + overscan', () => {
    createScope(() => {
      const host = makeScrollHost(200);
      const v = createVirtualizer({
        count: 1000,
        itemSize: 40,
        overscan: 2,
        scrollElement: host,
      });
      flushSync();
      const items = v.virtualItems();
      // viewport 200 / item 40 = 5 visible, +overscan on each side = up to 9.
      expect(items.length).toBeLessThanOrEqual(12);
      expect(items[0].index).toBe(0);
    });
  });

  it('supports variable-size items via callback', () => {
    createScope(() => {
      const host = makeScrollHost(200);
      const v = createVirtualizer({
        count: 10,
        itemSize: (i) => 20 + i * 10,
        scrollElement: host,
      });
      flushSync();
      // Sum 20+30+40+...+110 = 650
      expect(v.totalSize()).toBe(650);
    });
  });
});

describe('VirtualList', () => {
  it('renders a subset of items', () => {
    createScope(() => {
      const data = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
      const el = VirtualList({
        data,
        itemSize: 30,
        size: 150,
        renderItem: (item) => {
          const div = document.createElement('div');
          div.textContent = item;
          return div;
        },
      });
      Object.defineProperty(el, 'clientHeight', { value: 150, configurable: true });
      document.body.appendChild(el);
      flushSync();
      const inner = el.querySelector('.mkt-virtual-list__inner') as HTMLElement;
      expect(inner.style.height).toBe('30000px');
      const rendered = el.querySelectorAll('.mkt-virtual-list__item');
      expect(rendered.length).toBeGreaterThan(0);
      expect(rendered.length).toBeLessThan(1000);
    });
  });
});
