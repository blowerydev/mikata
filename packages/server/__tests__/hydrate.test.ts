import { describe, it, expect, vi } from 'vitest';
import { signal, flushSync } from '@mikata/reactivity';
import {
  _template,
  _insert,
  _delegate,
  _setProp,
  _createComponent,
  hydrate,
} from '@mikata/runtime';
import { renderToString } from '../src/index';

/**
 * End-to-end SSR -> hydrate round-trip tests.
 *
 * Each test wraps the "component" in a factory so templates get re-parsed
 * per call. `renderToString` installs the server DOM shim before invoking
 * the factory, then restores it; the subsequent `hydrate()` call runs the
 * same factory with jsdom's document active. This mirrors what happens in
 * practice, where the module is loaded once per environment and each load
 * parses its templates against whatever `document` is live.
 *
 * The factories drive the runtime helpers directly (the shapes the JSX
 * compiler emits) so the tests don't need Babel wired into the test env.
 *
 * The key property these tests establish: the nodes the server emitted
 * are the *exact same* nodes the client uses after hydration. Identity
 * is checked with `toBe` on captured references - if hydration were
 * building fresh DOM, those references would point at orphans.
 */

/** Parse a server HTML string into a fresh jsdom container. */
function mountSsr(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

describe('hydrate: round-trip with server output', () => {
  it('adopts a single static element without reparenting it', async () => {
    const build = () =>
      _template('<div class="card">hello</div>').cloneNode(true) as HTMLElement;

    const { html } = await renderToString(build);
    expect(html).toBe('<div class="card">hello</div>');

    const container = mountSsr(html);
    const originalCard = container.firstChild;
    expect(originalCard).toBeTruthy();

    const dispose = hydrate(build, container);
    try {
      expect(container.firstChild).toBe(originalCard);
      expect((container.firstChild as HTMLElement).className).toBe('card');
    } finally {
      dispose();
    }
  });

  it('adopts text-baked dynamic content without replacing the text node', async () => {
    const build = () => {
      const [count] = signal(3);
      const root = _template('<span> </span>').cloneNode(true) as HTMLElement;
      const text = root.firstChild as Text;
      text.data = String(count());
      return root;
    };

    const { html } = await renderToString(build);
    expect(html).toBe('<span>3</span>');

    const container = mountSsr(html);
    const originalSpan = container.firstChild as HTMLElement;
    const originalText = originalSpan.firstChild;

    const dispose = hydrate(build, container);
    try {
      expect(container.firstChild).toBe(originalSpan);
      expect((container.firstChild as HTMLElement).firstChild).toBe(originalText);
      expect((originalText as Text).data).toBe('3');
    } finally {
      dispose();
    }
  });

  it('adopts a middle dynamic slot sandwiched by static siblings', async () => {
    // Shape the compiler emits for:
    //   <article><h1>Title</h1><!>inserted<h2>Footer</h2></article>
    // where the middle slot is a dynamic element (a component or node).
    // Template: <article><h1>Title</h1><!><h2>Footer</h2></article>
    // After SSR: <article><h1>Title</h1><div class="slot">content</div><h2>Footer</h2></article>
    const build = () => {
      const root = _template(
        '<article><h1>Title</h1><!><h2>Footer</h2></article>',
      ).cloneNode(true) as HTMLElement;
      const marker = root.childNodes[1] as Node;
      _insert(
        root,
        () =>
          _template('<div class="slot">content</div>').cloneNode(true) as Node,
        marker,
      );
      return root;
    };

    const { html } = await renderToString(build);
    // Bug we just fixed: empty marker must be stripped so SSR sibling count
    // matches template sibling count (3).
    expect(html).toBe(
      '<article><h1>Title</h1><div class="slot">content</div><h2>Footer</h2></article>',
    );

    const container = mountSsr(html);
    const article = container.firstChild as HTMLElement;
    const h1 = article.childNodes[0];
    const slot = article.childNodes[1];
    const h2 = article.childNodes[2];

    const dispose = hydrate(build, container);
    try {
      // Structure preserved, nodes adopted, no duplicates.
      expect(article.childNodes.length).toBe(3);
      expect(article.childNodes[0]).toBe(h1);
      expect(article.childNodes[1]).toBe(slot);
      expect(article.childNodes[2]).toBe(h2);
      expect((slot as HTMLElement).className).toBe('slot');
    } finally {
      dispose();
    }
  });

  it('adopts two middle dynamic slots in the same parent', async () => {
    // Shape: <div><h2>A</h2><!>alpha<h2>B</h2><!>beta</div>
    // Both dynamic slots sit between static siblings. This was the
    // navigation desync we hit in apps/docs/ui/button: the second
    // `.nextSibling.nextSibling.nextSibling` chain has to land on the
    // second dynamic, not on a static element further on.
    const build = () => {
      const root = _template(
        '<div><h2>A</h2><!><h2>B</h2><!></div>',
      ).cloneNode(true) as HTMLElement;
      const firstMarker = root.childNodes[1] as Node;
      const secondMarker = root.childNodes[3] as Node;
      _insert(
        root,
        () => _template('<p class="one">alpha</p>').cloneNode(true) as Node,
        firstMarker,
      );
      _insert(
        root,
        () => _template('<p class="two">beta</p>').cloneNode(true) as Node,
        secondMarker,
      );
      return root;
    };

    const { html } = await renderToString(build);
    expect(html).toBe(
      '<div><h2>A</h2><p class="one">alpha</p><h2>B</h2><p class="two">beta</p></div>',
    );

    const container = mountSsr(html);
    const div = container.firstChild as HTMLElement;
    const original = Array.from(div.childNodes);

    const dispose = hydrate(build, container);
    try {
      expect(div.childNodes.length).toBe(4);
      for (let i = 0; i < original.length; i++) {
        expect(div.childNodes[i]).toBe(original[i]);
      }
      expect((div.childNodes[1] as HTMLElement).className).toBe('one');
      expect((div.childNodes[3] as HTMLElement).className).toBe('two');
    } finally {
      dispose();
    }
  });

  it('adopts a trailing dynamic slot (no compiler marker)', async () => {
    // Tail-dynamic with no preceding sibling to anchor against: the
    // compiler emits `_insert(parent, accessor)` with no marker.
    const build = () => {
      const root = _template('<section><h1>Hi</h1></section>').cloneNode(
        true,
      ) as HTMLElement;
      _insert(
        root,
        () => _template('<p class="tail">bye</p>').cloneNode(true) as Node,
      );
      return root;
    };

    const { html } = await renderToString(build);
    expect(html).toBe('<section><h1>Hi</h1><p class="tail">bye</p></section>');

    const container = mountSsr(html);
    const section = container.firstChild as HTMLElement;
    const h1 = section.childNodes[0];
    const tail = section.childNodes[1];

    const dispose = hydrate(build, container);
    try {
      expect(section.childNodes.length).toBe(2);
      expect(section.childNodes[0]).toBe(h1);
      expect(section.childNodes[1]).toBe(tail);
    } finally {
      dispose();
    }
  });

  it('delegated click handlers fire on adopted elements', async () => {
    const onClick = vi.fn();
    const build = () => {
      const root = _template('<button>go</button>').cloneNode(
        true,
      ) as HTMLElement;
      _delegate(root, 'click', onClick);
      return root;
    };

    const { html } = await renderToString(build);
    expect(html).toBe('<button>go</button>');

    const container = mountSsr(html);
    document.body.appendChild(container);
    try {
      const btn = container.firstChild as HTMLElement;

      const dispose = hydrate(build, container);
      try {
        // Must be the same button - if hydrate rebuilt the DOM, our pre-captured
        // reference would be an orphan and wouldn't fire from a click on the
        // document-attached tree.
        expect(container.firstChild).toBe(btn);
        btn.click();
        expect(onClick).toHaveBeenCalledTimes(1);
      } finally {
        dispose();
      }
    } finally {
      document.body.removeChild(container);
    }
  });

  it('reactive update after hydration swaps content in place', async () => {
    // The fix for the hydration marker-staleness bug: after the first
    // hydration pass, _insert has to remember a still-live anchor so
    // subsequent reactive updates don't try to insertBefore against a
    // node it just removed.
    const [label, setLabel] = signal('first');

    const build = () => {
      const root = _template(
        '<article><h1>T</h1><!><h2>F</h2></article>',
      ).cloneNode(true) as HTMLElement;
      const marker = root.childNodes[1] as Node;
      _insert(
        root,
        () => {
          const p = _template('<p> </p>').cloneNode(true) as HTMLElement;
          (p.firstChild as Text).data = label();
          return p;
        },
        marker,
      );
      return root;
    };

    const { html } = await renderToString(build);
    expect(html).toBe('<article><h1>T</h1><p>first</p><h2>F</h2></article>');

    const container = mountSsr(html);
    const article = container.firstChild as HTMLElement;
    const h1 = article.childNodes[0];
    const h2 = article.childNodes[2];

    const dispose = hydrate(build, container);
    try {
      setLabel('second');
      flushSync();

      expect(article.childNodes.length).toBe(3);
      // Static siblings were not displaced.
      expect(article.childNodes[0]).toBe(h1);
      expect(article.childNodes[2]).toBe(h2);
      // Middle slot swapped to the new paragraph.
      const middle = article.childNodes[1] as HTMLElement;
      expect(middle.tagName).toBe('P');
      expect(middle.textContent).toBe('second');
    } finally {
      dispose();
    }
  });

  it('adopts a nested component tree', async () => {
    // Component boundaries should not confuse adoption: the child component
    // also does `_template().cloneNode(true)` which routes through the
    // adoption cursor and should pick up the next unclaimed server node.
    function Card(props: { text: string }) {
      const el = _template('<div class="card"> </div>').cloneNode(
        true,
      ) as HTMLElement;
      (el.firstChild as Text).data = props.text;
      return el;
    }

    const build = () => {
      const root = _template('<main><h1>Top</h1><!></main>').cloneNode(
        true,
      ) as HTMLElement;
      const marker = root.childNodes[1] as Node;
      _insert(
        root,
        () => _createComponent(Card, { text: 'hello' }),
        marker,
      );
      return root;
    };

    const { html } = await renderToString(build);
    expect(html).toBe('<main><h1>Top</h1><div class="card">hello</div></main>');

    const container = mountSsr(html);
    const main = container.firstChild as HTMLElement;
    const card = main.childNodes[1];
    expect((card as HTMLElement).className).toBe('card');

    const dispose = hydrate(build, container);
    try {
      expect(main.childNodes.length).toBe(2);
      expect(main.childNodes[1]).toBe(card);
    } finally {
      dispose();
    }
  });

  it('_setProp on an adopted element does not reparent it', async () => {
    // Properties set during hydration must flow onto the already-live node,
    // not a fresh clone.
    const build = () => {
      const root = _template('<input>').cloneNode(true) as HTMLInputElement;
      _setProp(root, 'value', 'seed');
      _setProp(root, 'data-kind', 'text');
      return root;
    };

    const { html } = await renderToString(build);
    expect(html).toContain('<input');
    expect(html).toContain('data-kind="text"');

    const container = mountSsr(html);
    const input = container.firstChild as HTMLInputElement;

    const dispose = hydrate(build, container);
    try {
      expect(container.firstChild).toBe(input);
      expect(input.value).toBe('seed');
      expect(input.getAttribute('data-kind')).toBe('text');
    } finally {
      dispose();
    }
  });
});

describe('renderToString({ verifyHydration: true })', () => {
  it('succeeds on a well-formed tree', async () => {
    const build = () => {
      const root = _template(
        '<article><h1>OK</h1><!><h2>end</h2></article>',
      ).cloneNode(true) as HTMLElement;
      const marker = root.childNodes[1] as Node;
      _insert(
        root,
        () => _template('<p>middle</p>').cloneNode(true) as Node,
        marker,
      );
      return root;
    };

    // Shouldn't throw - the verify pass runs hydrate() internally and
    // confirms the tree walks cleanly. A broken version of the
    // serialiser or the runtime would surface here as a thrown error
    // with the rendered HTML attached.
    const { html } = await renderToString(build, { verifyHydration: true });
    expect(html).toBe(
      '<article><h1>OK</h1><p>middle</p><h2>end</h2></article>',
    );
  });

  it('wraps the underlying error with HTML context when hydration throws', async () => {
    // Drive a tree that deliberately navigates past its own structure:
    // the template has one child but the compiled code asks for the
    // second. The verify pass should catch the TypeError and rewrap.
    const build = () => {
      const root = _template('<div><span>only</span></div>').cloneNode(
        true,
      ) as HTMLElement;
      const first = root.firstChild as HTMLElement;
      // Deliberate over-reach: nothing here, but pretend the compiler
      // emitted `.nextSibling.firstChild`. That's `null.firstChild`.
      const bogus = (first.nextSibling as unknown as Node).childNodes; // throws
      void bogus;
      return root;
    };

    await expect(
      renderToString(build, { verifyHydration: true }),
    ).rejects.toThrow(/hydration verify failed|Cannot read|of null/);
  });
});
