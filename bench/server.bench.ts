import { bench, describe } from 'vitest';
import { signal } from '@mikata/reactivity';
import { _createFragment, _insert, _template, each } from '@mikata/runtime';
import { renderToString } from '@mikata/server';

let sink = 0;

const rows = Array.from({ length: 100 }, (_, index) => ({
  id: index,
  label: `Row ${index}`,
}));

describe('@mikata/server', () => {
  bench('render static card to string', async () => {
    const { html } = await renderToString(
      () => _template('<article><h1>Hello</h1><p>Static body</p></article>').cloneNode(true),
      { skipQueryCollection: true },
    );
    sink += html.length;
  });

  bench('render keyed list of 100 rows to string', async () => {
    const { html } = await renderToString(() => {
      const [items] = signal(rows);
      const root = _template('<ul></ul>').cloneNode(true) as HTMLElement;
      _insert(
        root,
        () => each(items, (item) => {
          const li = _template('<li> </li>').cloneNode(true) as HTMLElement;
          li.firstChild!.textContent = item.label;
          return li;
        }, undefined, { key: (item) => item.id }),
      );
      return root;
    }, { skipQueryCollection: true });
    sink += html.length;
  });

  bench('render fragment with 100 static children to string', async () => {
    const { html } = await renderToString(() => {
      const children = rows.map((row) => {
        const node = _template('<span> </span>').cloneNode(true) as HTMLElement;
        node.firstChild!.textContent = row.label;
        return node;
      });
      return _createFragment(children);
    }, { skipQueryCollection: true });
    sink += html.length;
  });
});

void sink;
