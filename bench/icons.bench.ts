import { bench, describe } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  Check,
  ChevronDown,
  Close,
  ErrorCircle,
  Home,
  Search,
  Settings,
  User,
  Warning,
  createIcon,
} from '@mikata/icons';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;

let sink = 0;

const icons = [
  Check,
  ChevronDown,
  Close,
  ErrorCircle,
  Home,
  Search,
  Settings,
  User,
  Warning,
];

describe('@mikata/icons', () => {
  bench('create 1k built-in SVG icons', () => {
    let total = 0;
    for (let i = 0; i < 1_000; i++) {
      const svg = createIcon(icons[i % icons.length], {
        size: 16 + (i % 4) * 2,
        class: 'icon',
        'aria-label': `Icon ${i}`,
      });
      total += svg.childNodes.length;
    }
    sink = total;
  });

  bench('create and append 1k SVG icons', () => {
    const root = document.createElement('div');
    for (let i = 0; i < 1_000; i++) {
      root.appendChild(createIcon(icons[i % icons.length], { size: 20 }));
    }
    sink = root.childNodes.length;
  });
});

void sink;
