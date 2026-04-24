/**
 * SSR round-trip integration test.
 *
 * Exercises the full pipeline: build a component tree using the same runtime
 * primitives the compiler emits, serialise it with `renderToString`, then
 * parse the HTML back into the test's JSDOM, hydrate it, and confirm the
 * signals still drive DOM updates.
 */

import { describe, it, expect } from 'vitest';
import { signal, flushSync } from '@mikata/reactivity';
import {
  _template,
  _insert,
  _delegate,
  _createComponent,
  show,
  each,
  hydrate,
} from '@mikata/runtime';
import { renderToString } from '@mikata/server';
import { createQuery } from '@mikata/store';

function makeCounter() {
  const [count, setCount] = signal(0);
  function Counter() {
    const root = _template('<button>count: <!>!</button>').cloneNode(true) as any;
    const marker = root.childNodes[1];
    _insert(root, () => count(), marker);
    _delegate(root, 'click', () => setCount(count() + 1));
    return root;
  }
  return { Counter, count, setCount };
}

describe('SSR: renderToString → hydrate round-trip', () => {
  it('renders a counter to HTML and the hydrated copy is interactive', async () => {
    const { Counter } = makeCounter();
    const { html } = await renderToString(() => _createComponent(Counter, {}));
    expect(html).toContain('count:');
    expect(html).toContain('0');

    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);

    // Capture the server-rendered button identity before hydration so we
    // can assert that hydrate() adopted the node instead of rebuilding.
    const serverButton = host.querySelector('button')!;

    const { Counter: ClientCounter, count, setCount } = makeCounter();
    const dispose = hydrate(() => _createComponent(ClientCounter, {}), host);
    try {
      const btn = host.querySelector('button')!;
      // Same DOM node identity — proves the server HTML was adopted, not
      // destroyed and replaced.
      expect(btn).toBe(serverButton);
      expect(btn.textContent).toContain('0');
      btn.click();
      flushSync();
      expect(count()).toBe(1);
      expect(host.querySelector('button')!.textContent).toContain('1');
      // Node identity still the same after reactive updates.
      expect(host.querySelector('button')!).toBe(serverButton);
      setCount(5);
      flushSync();
      expect(host.querySelector('button')!.textContent).toContain('5');
    } finally {
      dispose();
      host.remove();
    }
  });

  it('hydrates a show() branch and wires click handlers on the adopted node', async () => {
    function makeToggle() {
      const [flag, setFlag] = signal(true);
      const clicks: string[] = [];
      function View() {
        const root = _template('<section></section>').cloneNode(true) as any;
        _insert(root, () =>
          show(
            flag,
            () => {
              const p = _template('<p>visible</p>').cloneNode(true) as any;
              _delegate(p, 'click', () => clicks.push('visible'));
              return p;
            },
            () => {
              const p = _template('<p>hidden</p>').cloneNode(true) as any;
              _delegate(p, 'click', () => clicks.push('hidden'));
              return p;
            },
          ),
        );
        return root;
      }
      return { View, flag, setFlag, clicks };
    }

    const server = makeToggle();
    const { html } = await renderToString(() => _createComponent(server.View, {}));
    expect(html).toContain('<p>visible</p>');

    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    const serverP = host.querySelector('p')!;

    const client = makeToggle();
    const dispose = hydrate(() => _createComponent(client.View, {}), host);
    try {
      const p = host.querySelector('p')!;
      expect(p).toBe(serverP);
      (p as HTMLElement).click();
      expect(client.clicks).toEqual(['visible']);

      // Flip branches post-hydration - should swap the adopted <p> for the
      // fallback without leaving ghosts.
      client.setFlag(false);
      flushSync();
      expect(host.textContent).toContain('hidden');
      expect(host.textContent).not.toContain('visible');
    } finally {
      dispose();
      host.remove();
    }
  });

  it('hydrates show(keepAlive) and keeps adopted content wired after a toggle', async () => {
    function makeKeepAlive() {
      const [flag, setFlag] = signal(true);
      const clicks: string[] = [];
      function View() {
        const root = _template('<section></section>').cloneNode(true) as any;
        _insert(root, () =>
          show(
            flag,
            () => {
              const p = _template('<p>visible</p>').cloneNode(true) as any;
              _delegate(p, 'click', () => clicks.push('visible'));
              return p;
            },
            () => {
              const p = _template('<p>hidden</p>').cloneNode(true) as any;
              _delegate(p, 'click', () => clicks.push('hidden'));
              return p;
            },
            { keepAlive: true },
          ),
        );
        return root;
      }
      return { View, flag, setFlag, clicks };
    }

    const server = makeKeepAlive();
    const { html } = await renderToString(() => _createComponent(server.View, {}));
    // SSR emits the <div style="display:contents"> wrapper + inner <p>.
    expect(html).toContain('visible');

    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    const serverP = host.querySelector('p')!;

    const client = makeKeepAlive();
    const dispose = hydrate(() => _createComponent(client.View, {}), host);
    try {
      const p = host.querySelector('p')!;
      // Adopted the SSR <p>, not a rebuilt copy.
      expect(p).toBe(serverP);
      (p as HTMLElement).click();
      expect(client.clicks).toEqual(['visible']);

      // Toggle to fallback; the adopted wrapper is hidden, a fresh fallback
      // wrapper mounts alongside it.
      client.setFlag(false);
      flushSync();
      const visibleText = host.textContent ?? '';
      expect(visibleText).toContain('hidden');

      // Toggling back should re-show the adopted node (kept alive, not rebuilt).
      client.setFlag(true);
      flushSync();
      expect(host.querySelector('p')).toBe(serverP);
    } finally {
      dispose();
      host.remove();
    }
  });

  it('hydrates ThemeProvider without orphaning its wrapper div', async () => {
    const { ThemeProvider } = await import('@mikata/ui');

    function View() {
      // Children are evaluated lazily (as a getter) so cloneNode's
      // adoption runs inside ThemeProvider's pushed frame — the same
      // shape the compiler emits for `<ThemeProvider>{child}</ThemeProvider>`.
      return ThemeProvider({
        colorScheme: 'dark',
        get children() {
          return _template('<section><p>hello</p></section>').cloneNode(true) as any;
        },
      });
    }

    const { html } = await renderToString(() => _createComponent(View, {}));
    expect(html).toContain('data-mkt-theme');
    expect(html).toContain('data-mkt-color-scheme="dark"');

    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    const serverWrapper = host.querySelector('[data-mkt-theme]') as HTMLElement;
    expect(serverWrapper).toBeTruthy();
    const serverSection = host.querySelector('section')!;

    const dispose = hydrate(() => _createComponent(View, {}), host);
    try {
      // Wrapper is adopted, not rebuilt, so we don't end up with a
      // ghost SSR wrapper alongside a fresh client one.
      const wrappers = host.querySelectorAll('[data-mkt-theme]');
      expect(wrappers).toHaveLength(1);
      expect(wrappers[0]).toBe(serverWrapper);
      expect(host.querySelector('section')).toBe(serverSection);
      expect(serverWrapper.getAttribute('data-mkt-color-scheme')).toBe('dark');
      expect(serverWrapper.style.getPropertyValue('--mkt-color-bg')).toBeTruthy();
    } finally {
      dispose();
      host.remove();
    }
  });

  it('preserves show() branch markers in the wire HTML', async () => {
    const { html } = await renderToString(() => {
      const [flag] = signal(true);
      const root = _template('<section></section>').cloneNode(true) as any;
      _insert(root, () =>
        show(
          flag,
          () => _template('<p>visible</p>').cloneNode(true),
          () => _template('<p>hidden</p>').cloneNode(true),
        ),
      );
      return root;
    });
    expect(html).toContain('visible');
    expect(html).not.toContain('hidden');
  });

  it('hydrates each() rows and wires click handlers to the SSR-rendered <li>s', async () => {
    function makeList() {
      const [items, setItems] = signal([
        { id: 1, label: 'apple' },
        { id: 2, label: 'banana' },
        { id: 3, label: 'cherry' },
      ]);
      const clicks: number[] = [];
      function List() {
        const root = _template('<ul></ul>').cloneNode(true) as any;
        _insert(root, () =>
          each(
            items,
            (item) => {
              const li = _template('<li> </li>').cloneNode(true) as any;
              li.firstChild.data = item.label;
              _delegate(li, 'click', () => clicks.push(item.id));
              return li;
            },
            undefined,
            { key: (item: any) => item.id },
          ),
        );
        return root;
      }
      return { List, items, setItems, clicks };
    }

    const server = makeList();
    const { html } = await renderToString(() => _createComponent(server.List, {}));
    expect(html).toContain('<li>apple</li>');
    expect(html).toContain('<li>banana</li>');
    expect(html).toContain('<li>cherry</li>');

    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);

    const serverLis = Array.from(host.querySelectorAll('li'));
    expect(serverLis).toHaveLength(3);

    const client = makeList();
    const dispose = hydrate(() => _createComponent(client.List, {}), host);
    try {
      const lis = Array.from(host.querySelectorAll('li'));
      // Same DOM node identity - proves adoption rather than rebuild.
      expect(lis[0]).toBe(serverLis[0]);
      expect(lis[1]).toBe(serverLis[1]);
      expect(lis[2]).toBe(serverLis[2]);
      expect(lis.map((li) => li.textContent)).toEqual(['apple', 'banana', 'cherry']);

      // Click handlers on the SSR-rendered <li>s must fire.
      (lis[1] as HTMLElement).click();
      expect(client.clicks).toEqual([2]);

      // Reactive updates post-hydration still work through the marker anchor.
      client.setItems([
        { id: 1, label: 'apple' },
        { id: 2, label: 'banana' },
        { id: 3, label: 'cherry' },
        { id: 4, label: 'date' },
      ]);
      flushSync();
      const liTexts = Array.from(host.querySelectorAll('li')).map((li) => li.textContent);
      expect(liTexts).toEqual(['apple', 'banana', 'cherry', 'date']);

      // Removing an item reconciles without losing the remaining adopted nodes.
      client.setItems([
        { id: 2, label: 'banana' },
        { id: 3, label: 'cherry' },
        { id: 4, label: 'date' },
      ]);
      flushSync();
      const afterRemove = Array.from(host.querySelectorAll('li')).map((li) => li.textContent);
      expect(afterRemove).toEqual(['banana', 'cherry', 'date']);
    } finally {
      dispose();
      host.remove();
    }
  });

  it('serialises each() rows deterministically', async () => {
    const { html } = await renderToString(() => {
      const [items] = signal([
        { id: 1, label: 'apple' },
        { id: 2, label: 'banana' },
        { id: 3, label: 'cherry' },
      ]);
      const root = _template('<ul></ul>').cloneNode(true) as any;
      _insert(root, () =>
        each(
          items,
          (item) => {
            const li = _template('<li> </li>').cloneNode(true) as any;
            li.firstChild.data = item.label;
            return li;
          },
          undefined,
          { key: (item: any) => item.id },
        ),
      );
      return root;
    });
    expect(html).toContain('<li>apple</li>');
    expect(html).toContain('<li>banana</li>');
    expect(html).toContain('<li>cherry</li>');
    // Order preserved in the serialised output.
    expect(html.indexOf('apple')).toBeLessThan(html.indexOf('banana'));
    expect(html.indexOf('banana')).toBeLessThan(html.indexOf('cherry'));
  });
});

describe('SSR: state-script security posture', () => {
  it('embeds attacker-controlled payloads without breaking out of the script', async () => {
    const evil = '</script><script>window.__pwned=1</script><!-- \u2028 -->';
    const { stateScript } = await renderToString(() => {
      const query = createQuery({
        key: () => 'evil',
        fn: async () => ({ payload: evil }),
      });
      const root = _template('<div> </div>').cloneNode(true) as any;
      _insert(root, () => query.data()?.payload ?? '');
      return root;
    });
    // Only one </script> run: the trailing tag that closes the state block.
    const occurrences = stateScript.match(/<\/script>/gi) ?? [];
    expect(occurrences.length).toBe(1);
    // U+2028 and U+2029 never survive unescaped.
    expect(stateScript).not.toContain('\u2028');
    expect(stateScript).not.toContain('\u2029');
    expect(stateScript).toContain('\\u003c');
  });
});

describe('SSR: query hydration primes the client without refetching', () => {
  it('seeds createQuery from window.__MIKATA_STATE__', async () => {
    // Step 1: server renders, producing HTML + state.
    let serverFetches = 0;
    const { state } = await renderToString(() => {
      const query = createQuery({
        key: () => 'user:42',
        fn: async () => {
          serverFetches++;
          return { name: 'Ada' };
        },
      });
      const root = _template('<p> </p>').cloneNode(true) as any;
      _insert(root, () => query.data()?.name ?? '');
      return root;
    });
    expect(serverFetches).toBe(1);

    // Step 2: client installs the state payload, then creates a matching
    // query. The seed should be picked up and the client fn never invoked.
    (globalThis as any).window ??= globalThis;
    (globalThis as any).window.__MIKATA_STATE__ = state;
    try {
      let clientFetches = 0;
      const query = createQuery({
        key: () => 'user:42',
        fn: async () => {
          clientFetches++;
          return { name: 'Grace' };
        },
      });
      // flushSync forces the effect to run synchronously so we can assert
      // on `clientFetches` without racing microtasks.
      flushSync();
      expect(query.status()).toBe('success');
      expect(query.data()).toEqual({ name: 'Ada' });
      expect(clientFetches).toBe(0);
    } finally {
      delete (globalThis as any).window.__MIKATA_STATE__;
    }
  });
});
