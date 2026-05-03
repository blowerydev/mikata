import { afterAll, bench, describe } from 'vitest';
import { JSDOM } from 'jsdom';
import { createScope, flushSync, signal } from '@mikata/reactivity';
import {
  _insert,
  _setProp,
  _template,
  each,
  show,
} from '@mikata/runtime';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.DocumentFragment = dom.window.DocumentFragment;

let sink = 0;

const cardTemplate = _template(
  '<article class="card"><h2>Title</h2><p>Body</p><button>Open</button></article>',
);

const textRoot = document.createElement('p');
const [textValue, setTextValue] = signal(0);
const textScope = createScope(() => {
  _insert(textRoot, () => textValue());
});
flushSync();

const listRoot = document.createElement('ul');
const listMarker = document.createComment('list');
listRoot.appendChild(listMarker);
const baseItems = Array.from({ length: 300 }, (_, id) => ({ id, label: `Item ${id}` }));
const reversedItems = [...baseItems].reverse();
const [listItems, setListItems] = signal(baseItems);
const listScope = createScope(() => {
  _insert(
    listRoot,
    () => each(
      listItems,
      (item) => {
        const li = document.createElement('li');
        li.textContent = item.label;
        return li;
      },
      undefined,
      { key: (item) => item.id },
    ),
    listMarker,
  );
});
flushSync();
let listReversed = false;

const showRoot = document.createElement('div');
const showMarker = document.createComment('show');
showRoot.appendChild(showMarker);
const [visible, setVisible] = signal(true);
const showScope = createScope(() => {
  _insert(
    showRoot,
    () => show(
      visible,
      () => _template('<strong>Visible</strong>').cloneNode(true),
      () => _template('<em>Hidden</em>').cloneNode(true),
    ),
    showMarker,
  );
});
flushSync();

const propTarget = document.createElement('div');

describe('@mikata/runtime', () => {
  bench('clone static template 1k times', () => {
    let total = 0;
    for (let i = 0; i < 1_000; i++) {
      const node = cardTemplate.cloneNode(true);
      total += node.childNodes.length;
    }
    sink = total;
  });

  bench('update dynamic text 1k times', () => {
    for (let i = 0; i < 1_000; i++) {
      setTextValue((value) => value + 1);
      flushSync();
    }
    sink = textRoot.textContent?.length ?? 0;
  });

  bench('reconcile keyed each reversal of 300 rows', () => {
    listReversed = !listReversed;
    setListItems(listReversed ? reversedItems : baseItems);
    flushSync();
    sink = listRoot.childNodes.length;
  });

  bench('toggle show branch 1k times', () => {
    for (let i = 0; i < 1_000; i++) {
      setVisible((value) => !value);
      flushSync();
    }
    sink = showRoot.textContent?.length ?? 0;
  });

  bench('set class/style/boolean props 10k times', () => {
    for (let i = 0; i < 10_000; i++) {
      _setProp(propTarget, 'class', { active: i % 2 === 0, muted: i % 3 === 0 });
      _setProp(propTarget, 'style', { transform: `translateX(${i}px)`, opacity: i % 2 ? 0.5 : 1 });
      _setProp(propTarget, 'hidden', i % 5 === 0);
    }
    sink = propTarget.className.length;
  });
});

afterAll(() => {
  textScope.dispose();
  listScope.dispose();
  showScope.dispose();
});

void sink;
