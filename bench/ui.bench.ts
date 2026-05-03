import { afterAll, bench, describe } from 'vitest';
import { JSDOM } from 'jsdom';
import { createScope, flushSync } from '@mikata/reactivity';
import { createVirtualizer } from '../packages/ui/src/components/VirtualList/virtualizer';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;

let sink = 0;

function createScrollElement() {
  const element = document.createElement('div');
  Object.defineProperty(element, 'clientHeight', { value: 600, configurable: true });
  Object.defineProperty(element, 'clientWidth', { value: 800, configurable: true });
  document.body.appendChild(element);
  return element;
}

describe('@mikata/ui VirtualList', () => {
  const fixedScrollElement = createScrollElement();
  const fixedScope = createScope(() => {
    const virtualizer = createVirtualizer({
      count: 100_000,
      itemSize: 32,
      overscan: 5,
      scrollElement: fixedScrollElement,
    });

    bench('fixed-size visible range across 1k scroll positions', () => {
      let total = 0;
      for (let i = 0; i < 1_000; i++) {
        fixedScrollElement.scrollTop = (i * 337) % 3_000_000;
        virtualizer.measure();
        flushSync();
        total += virtualizer.virtualItems().length;
      }
      sink = total + virtualizer.totalSize();
    });

    bench('scrollToIndex fixed-size list 10k times', () => {
      for (let i = 0; i < 10_000; i++) {
        virtualizer.scrollToIndex((i * 97) % 100_000, i % 3 === 0 ? 'start' : i % 3 === 1 ? 'center' : 'end');
      }
      sink = fixedScrollElement.scrollTop;
    });
  });

  const variableScrollElement = createScrollElement();
  const variableScope = createScope(() => {
    const virtualizer = createVirtualizer({
      count: 25_000,
      itemSize: (index) => 24 + (index % 7) * 3,
      overscan: 8,
      scrollElement: variableScrollElement,
    });

    bench('variable-size visible range across 1k scroll positions', () => {
      let total = 0;
      for (let i = 0; i < 1_000; i++) {
        variableScrollElement.scrollTop = (i * 211) % 700_000;
        virtualizer.measure();
        flushSync();
        total += virtualizer.virtualItems()[0]?.index ?? 0;
      }
      sink = total + virtualizer.totalSize();
    });

    bench('remeasure variable-size offsets for 25k rows', () => {
      virtualizer.measure();
      flushSync();
      sink = virtualizer.totalSize();
    });
  });

  afterAll(() => {
    fixedScope.dispose();
    variableScope.dispose();
  });
});

void sink;
