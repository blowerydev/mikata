import { describe, it, expect } from 'vitest';
import { signal, computed } from '@mikata/reactivity';
import {
  _template,
  _insert,
  _delegate,
  _setProp,
  _createComponent,
  _createFragment,
  show,
  each,
} from '@mikata/runtime';
import { installShim } from '../src/dom-shim';
import { serializeNode } from '../src/serialize';
import { renderToString } from '../src/index';

// These tests drive the runtime helpers directly (mimicking what the JSX
// compiler emits) so we can assert against the SSR shim without wiring
// Babel into the test environment.

describe('renderToString', () => {
  it('serialises a single static element', async () => {
    const { html } = await renderToString(() => {
      // shim must be active inside this callback
      const tpl = _template('<div class="card">hi</div>');
      return tpl.cloneNode(true);
    });
    expect(html).toBe('<div class="card">hi</div>');
  });

  it('serialises a component with a reactive text-bake', async () => {
    const { html } = await renderToString(() => {
      const [count] = signal(3);
      // Pattern the compiler emits for `<span>{count()}</span>`
      const tpl = _template('<span> </span>');
      const el = tpl.cloneNode(true) as any;
      el.firstChild.data = count() ?? '';
      return el;
    });
    expect(html).toBe('<span>3</span>');
  });

  it('serialises `show()` with the matching branch only', async () => {
    const { html } = await renderToString(() => {
      const [flag] = signal(true);
      const root = _template('<div></div>').cloneNode(true) as any;
      _insert(root, () => show(flag, () => {
        const n = _template('<span>on</span>').cloneNode(true);
        return n;
      }, () => _template('<span>off</span>').cloneNode(true)));
      return root;
    });
    // Comment markers survive so hydration can line up.
    expect(html).toContain('<span>on</span>');
    expect(html).not.toContain('<span>off</span>');
  });

  it('serialises `each()` over a list', async () => {
    const { html } = await renderToString(() => {
      const [items] = signal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
      const root = _template('<ul></ul>').cloneNode(true) as any;
      _insert(root, () => each(items, (item) => {
        const li = _template('<li> </li>').cloneNode(true) as any;
        li.firstChild.data = item.label;
        return li;
      }, undefined, { key: (item: any) => item.id }));
      return root;
    });
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<li>b</li>');
    expect(html).toContain('</ul>');
  });

  it('drops event handlers (no on* attributes emitted)', async () => {
    const { html } = await renderToString(() => {
      const root = _template('<button>click me</button>').cloneNode(true) as any;
      _delegate(root, 'click', () => {});
      return root;
    });
    expect(html).toBe('<button>click me</button>');
    // No event attribute (onclick=, $$click=) survives to the wire.
    expect(html).not.toMatch(/\bon[a-z]+\s*=/i);
    expect(html).not.toContain('$$click');
  });

  it('handles components that read computed values', async () => {
    function Greeting(props: { name: string }) {
      const upper = computed(() => (props.name || '').toUpperCase());
      const tpl = _template('<h1> </h1>');
      const el = tpl.cloneNode(true) as any;
      el.firstChild.data = upper();
      return el;
    }
    const { html } = await renderToString(() => _createComponent(Greeting, { name: 'ada' }));
    expect(html).toBe('<h1>ADA</h1>');
  });

  it('handles fragments', async () => {
    const { html } = await renderToString(() => {
      const a = _template('<p>a</p>').cloneNode(true);
      const b = _template('<p>b</p>').cloneNode(true);
      return _createFragment([a, b]);
    });
    expect(html).toBe('<p>a</p><p>b</p>');
  });

  it('escapes text content to prevent HTML injection', async () => {
    const { html } = await renderToString(() => {
      const root = _template('<div> </div>').cloneNode(true) as any;
      root.firstChild.data = '<script>alert(1)</script>';
      return root;
    });
    expect(html).toBe('<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>');
  });

  it('escapes attribute values set via _setProp', async () => {
    const { html } = await renderToString(() => {
      const root = _template('<a></a>').cloneNode(true) as any;
      _setProp(root, 'href', 'javascript:alert("xss")"');
      return root;
    });
    // The quote terminating the attr must be escaped — otherwise the
    // attribute would break out of its value.
    expect(html).not.toContain('alert("xss")"');
    expect(html).toContain('&quot;');
  });
});

describe('renderToString: query hydration', () => {
  it('awaits createQuery before emitting HTML and includes data in state', async () => {
    const { createQuery } = await import('@mikata/store');

    let fetchCount = 0;
    const { html, state, stateScript } = await renderToString(() => {
      const query = createQuery({
        key: () => 'user:1',
        fn: async () => {
          fetchCount++;
          return { name: 'Ada' };
        },
      });
      // Pretend this is a component that reads `query.data()`.
      const root = _template('<p> </p>').cloneNode(true) as any;
      _insert(root, () => query.data()?.name ?? 'loading');
      return root;
    });
    expect(fetchCount).toBe(1);
    expect(html).toContain('Ada');
    // Query data is keyed by the stable stringified key.
    expect(JSON.stringify(state)).toContain('Ada');
    expect(stateScript).toContain('<script>');
    expect(stateScript).toContain('window.__MIKATA_STATE__');
  });
});

describe('dom-shim install: restores prior globals', () => {
  it('does not leak after renderToString returns', async () => {
    const before = (globalThis as any).document;
    await renderToString(() => {
      const tpl = _template('<div></div>');
      return tpl.cloneNode(true);
    });
    const after = (globalThis as any).document;
    expect(after).toBe(before);
  });

  it('isServerRendering is only true during the render', async () => {
    const { isServerRendering } = await import('../src/dom-shim');
    expect(isServerRendering()).toBe(false);
    await renderToString(() => {
      expect(isServerRendering()).toBe(true);
      const shim = installShim();
      // Second install inside the same render returns the active handle.
      expect(shim).toBeTruthy();
      return _template('<div></div>').cloneNode(true);
    });
    expect(isServerRendering()).toBe(false);
  });
});
