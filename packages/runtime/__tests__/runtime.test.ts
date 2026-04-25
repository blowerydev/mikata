import { describe, it, expect, vi } from 'vitest';
import { signal, effect, reactive, computed, flushSync, onCleanup } from '@mikata/reactivity';
import {
  _createElement,
  _setProp,
  _insert,
  _createComponent,
  _createFragment,
  _spread,
  render,
  show,
  each,
  switchMatch,
  Dynamic,
  createContext,
  provide,
  inject,
  onMount,
  createDerivedSignal,
} from '../src/index';

describe('DOM helpers', () => {
  it('_createElement creates an element', () => {
    const el = _createElement('div');
    expect(el.tagName).toBe('DIV');
  });

  it('_setProp sets class', () => {
    const el = _createElement('div');
    _setProp(el, 'class', 'container');
    expect(el.className).toBe('container');
  });

  it('_setProp sets style as string', () => {
    const el = _createElement('div');
    _setProp(el, 'style', 'color: red');
    expect(el.style.color).toBe('red');
  });

  it('_setProp sets style as object', () => {
    const el = _createElement('div');
    _setProp(el, 'style', { color: 'blue', fontSize: '14px' });
    expect(el.style.color).toBe('blue');
    expect(el.style.fontSize).toBe('14px');
  });

  it('_setProp removes omitted keys from previous style objects', () => {
    const el = _createElement('div');
    _setProp(el, 'style', { color: 'red', fontSize: '14px' });
    _setProp(el, 'style', { fontSize: '16px' });
    expect(el.style.color).toBe('');
    expect(el.style.fontSize).toBe('16px');
  });

  it('_setProp sets boolean attributes', () => {
    const el = _createElement('input') as HTMLInputElement;
    _setProp(el, 'disabled', true);
    expect(el.disabled).toBe(true);
    _setProp(el, 'disabled', false);
    expect(el.disabled).toBe(false);
  });

  it('_setProp removes attribute when null', () => {
    const el = _createElement('div');
    el.setAttribute('data-x', 'value');
    _setProp(el, 'data-x', null);
    expect(el.hasAttribute('data-x')).toBe(false);
  });

  it('_insert appends a static text child', () => {
    const parent = _createElement('div');
    _insert(parent, () => 'Hello');
    flushSync();
    expect(parent.textContent).toBe('Hello');
  });

  it('_insert handles reactive text', () => {
    const [text, setText] = signal('hello');
    const parent = _createElement('div');
    _insert(parent, () => text());
    expect(parent.textContent).toBe('hello');

    setText('world');
    flushSync();
    expect(parent.textContent).toBe('world');
  });

  it('_createFragment creates a fragment', () => {
    const frag = _createFragment([
      document.createTextNode('A'),
      document.createTextNode('B'),
    ]);
    expect(frag.childNodes.length).toBe(2);
  });

  it('_spread swaps event listeners on prop change instead of accumulating', () => {
    const el = _createElement('button');
    const [handler, setHandler] = signal<() => void>(() => {});

    const counts = { a: 0, b: 0 };
    const handlerA = () => { counts.a++; };
    const handlerB = () => { counts.b++; };

    setHandler(() => handlerA);
    _spread(el, () => ({ onClick: handler() }));
    el.dispatchEvent(new MouseEvent('click'));
    expect(counts).toEqual({ a: 1, b: 0 });

    // Swap handler - the old one must be removed so the click only fires B.
    setHandler(() => handlerB);
    flushSync();
    el.dispatchEvent(new MouseEvent('click'));
    expect(counts).toEqual({ a: 1, b: 1 });

    // Remove handler entirely.
    setHandler(() => undefined as unknown as () => void);
    flushSync();
    el.dispatchEvent(new MouseEvent('click'));
    expect(counts).toEqual({ a: 1, b: 1 });
  });

  it('_setProp warns in dev when innerHTML contains script-like content', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = _createElement('div');

    _setProp(el, 'innerHTML', '<p>hello</p>');
    expect(warn).not.toHaveBeenCalled();

    _setProp(el, 'innerHTML', '<script>alert(1)</script>');
    expect(warn).toHaveBeenCalledTimes(1);

    _setProp(el, 'innerHTML', '<img src=x onerror=alert(1)>');
    expect(warn).toHaveBeenCalledTimes(2);

    _setProp(el, 'innerHTML', '<a href="javascript:alert(1)">');
    expect(warn).toHaveBeenCalledTimes(3);

    warn.mockRestore();
  });
});

describe('Component', () => {
  it('_createComponent creates a component', () => {
    function Hello() {
      const el = _createElement('span');
      el.textContent = 'Hello';
      return el;
    }

    const node = _createComponent(Hello, {});
    expect(node).toBeInstanceOf(HTMLSpanElement);
    expect((node as HTMLElement).textContent).toBe('Hello');
  });

  it('_createComponent passes props', () => {
    function Greet(props: { name: string }) {
      const el = _createElement('span');
      el.textContent = `Hi ${props.name}`;
      return el;
    }

    const node = _createComponent(Greet, { name: 'World' });
    expect((node as HTMLElement).textContent).toBe('Hi World');
  });

  it('_createComponent with reactive props via getters', () => {
    const [name, setName] = signal('Alice');

    function Greet(props: { name: string }) {
      const el = _createElement('span');
      // Simulate what compiler does: renderEffect reading props
      _insert(el, () => props.name);
      return el;
    }

    const container = _createElement('div');
    const node = _createComponent(Greet, {
      get name() { return name(); },
    });
    container.appendChild(node);

    expect(container.textContent).toBe('Alice');

    setName('Bob');
    flushSync();
    expect(container.textContent).toBe('Bob');
  });

  it('freezes props to block mutation inside the component', () => {
    function Bad(props: { x: number }) {
      // Reading works; writing must throw.
      expect(() => {
        (props as { x: number }).x = 99;
      }).toThrow(TypeError);
      return _createElement('span');
    }
    _createComponent(Bad, { x: 1 });
  });
});

describe('render', () => {
  it('mounts a component and returns dispose', () => {
    const container = _createElement('div');

    const dispose = render(() => {
      const el = _createElement('p');
      el.textContent = 'Hello Mikata';
      return el;
    }, container);

    expect(container.innerHTML).toBe('<p>Hello Mikata</p>');

    dispose();
    expect(container.innerHTML).toBe('');
  });
});

describe('show()', () => {
  it('renders when condition is truthy', () => {
    const container = _createElement('div');
    const node = show(
      () => true,
      () => {
        const el = _createElement('span');
        el.textContent = 'visible';
        return el;
      }
    );
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('visible');
  });

  it('renders fallback when condition is falsy', () => {
    const container = _createElement('div');
    const node = show(
      () => false,
      () => {
        const el = _createElement('span');
        el.textContent = 'visible';
        return el;
      },
      () => {
        const el = _createElement('span');
        el.textContent = 'fallback';
        return el;
      }
    );
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('fallback');
  });

  it('switches between render and fallback reactively', () => {
    const [loggedIn, setLoggedIn] = signal(false);
    const container = _createElement('div');

    const node = show(
      () => loggedIn(),
      () => {
        const el = _createElement('span');
        el.textContent = 'dashboard';
        return el;
      },
      () => {
        const el = _createElement('span');
        el.textContent = 'login';
        return el;
      }
    );
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('login');

    setLoggedIn(true);
    flushSync();
    expect(container.textContent).toBe('dashboard');

    setLoggedIn(false);
    flushSync();
    expect(container.textContent).toBe('login');
  });
});

describe('each()', () => {
  it('renders a list of items', () => {
    const container = _createElement('div');
    const items = reactive({ list: ['a', 'b', 'c'] });

    const node = each(
      () => items.list,
      (item) => {
        const el = _createElement('span');
        el.textContent = item;
        return el;
      }
    );
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('abc');
  });

  it('renders fallback for empty list', () => {
    const container = _createElement('div');

    const node = each(
      () => [] as string[],
      (item) => {
        const el = _createElement('span');
        el.textContent = item;
        return el;
      },
      () => {
        const el = _createElement('span');
        el.textContent = 'empty';
        return el;
      }
    );
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('empty');
  });

  it('updates index accessors when keyed rows are reused', () => {
    const container = _createElement('div');
    const [items, setItems] = signal([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ]);

    const node = each(
      items,
      (item, index) => {
        const el = _createElement('span');
        _insert(el, () => `${item.label}:${index()}`);
        return el;
      },
      undefined,
      { key: (item) => item.id },
    );
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('A:0B:1C:2');

    setItems([
      { id: 'c', label: 'C' },
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]);
    flushSync();
    expect(container.textContent).toBe('C:0A:1B:2');
  });
});

describe('switchMatch()', () => {
  it('renders the matching case', () => {
    const container = _createElement('div');
    const [status, setStatus] = signal<'loading' | 'success' | 'error'>('loading');

    const node = switchMatch(
      () => status(),
      {
        loading: () => {
          const el = _createElement('span');
          el.textContent = 'loading...';
          return el;
        },
        success: () => {
          const el = _createElement('span');
          el.textContent = 'done!';
          return el;
        },
        error: () => {
          const el = _createElement('span');
          el.textContent = 'error!';
          return el;
        },
      }
    );
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('loading...');

    setStatus('success');
    flushSync();
    expect(container.textContent).toBe('done!');

    setStatus('error');
    flushSync();
    expect(container.textContent).toBe('error!');
  });
});

describe('Dynamic', () => {
  function Red(props: { label: string }) {
    const el = _createElement('span');
    el.setAttribute('data-kind', 'red');
    _insert(el, () => props.label);
    return el;
  }
  function Blue(props: { label: string }) {
    const el = _createElement('strong');
    el.setAttribute('data-kind', 'blue');
    _insert(el, () => props.label);
    return el;
  }

  it('swaps components when the `component` prop changes', () => {
const container = _createElement('div');
    const [Comp, setComp] = signal<((p: { label: string }) => Node) | null>(Red);
    const node = _createComponent(Dynamic, {
      get component() { return Comp() as never; },
      label: 'hi',
    });
    container.appendChild(node);
    flushSync();
    expect(container.querySelector('[data-kind="red"]')?.textContent).toBe('hi');

    setComp(() => Blue);
    flushSync();
    expect(container.querySelector('[data-kind="red"]')).toBe(null);
    expect(container.querySelector('[data-kind="blue"]')?.textContent).toBe('hi');
  });

  it('forwards reactive props to the active component', () => {
const container = _createElement('div');
    const [label, setLabel] = signal('a');
    const node = _createComponent(Dynamic, {
      component: Red as never,
      get label() { return label(); },
    });
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('a');

    setLabel('b');
    flushSync();
    expect(container.textContent).toBe('b');
  });

  it('renders nothing when component is null', () => {
const container = _createElement('div');
    const [Comp, setComp] = signal<((p: { label: string }) => Node) | null>(null);
    const node = _createComponent(Dynamic, {
      get component() { return Comp() as never; },
      label: 'x',
    });
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('');

    setComp(() => Red);
    flushSync();
    expect(container.textContent).toBe('x');
  });

  it('disposes the previous component scope on swap', () => {
const cleanups: string[] = [];
    function A() {
      onCleanup(() => cleanups.push('A'));
      const el = _createElement('span');
      el.textContent = 'A';
      return el;
    }
    function B() {
      const el = _createElement('span');
      el.textContent = 'B';
      return el;
    }
    const container = _createElement('div');
    const [Comp, setComp] = signal<(() => Node) | null>(A);
    const node = _createComponent(Dynamic, {
      get component() { return Comp() as never; },
    });
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('A');

    setComp(() => B);
    flushSync();
    expect(container.textContent).toBe('B');
    expect(cleanups).toEqual(['A']);
  });
});

describe('context', () => {
  it('provide and inject pass values through scope', () => {
    const ThemeCtx = createContext<string>('light');
    let injectedValue: string | undefined;

    render(() => {
      provide(ThemeCtx, 'dark');

      return _createComponent(() => {
        injectedValue = inject(ThemeCtx);
        return _createElement('div');
      }, {});
    }, _createElement('div'));

    expect(injectedValue).toBe('dark');
  });

  it('provider with lazy children getter resolves context for descendants', () => {
    // Mirrors what the JSX compiler emits: children passed as a getter so
    // they evaluate inside the provider's setup scope, after provide() runs.
    const Ctx = createContext<string>('default');
    let injectedValue: string | undefined;

    function Provider(props: { children: Node }) {
      provide(Ctx, 'from-provider');
      const div = _createElement('div');
      div.appendChild(props.children);
      return div;
    }

    function Child() {
      injectedValue = inject(Ctx);
      return _createElement('span');
    }

    render(
      () =>
        _createComponent(Provider, {
          get children() {
            return _createComponent(Child, {});
          },
        } as any),
      _createElement('div'),
    );

    expect(injectedValue).toBe('from-provider');
  });

  it('uses default value when no provider', () => {
    const ThemeCtx = createContext<string>('light');
    let injectedValue: string | undefined;

    render(() => {
      return _createComponent(() => {
        injectedValue = inject(ThemeCtx);
        return _createElement('div');
      }, {});
    }, _createElement('div'));

    expect(injectedValue).toBe('light');
  });
});

describe('onMount', () => {
  it('runs after component setup', async () => {
    const events: string[] = [];

    render(() => {
      events.push('setup');
      onMount(() => events.push('mounted'));
      return _createElement('div');
    }, _createElement('div'));

    expect(events).toEqual(['setup']);

    // onMount uses queueMicrotask
    await new Promise((r) => queueMicrotask(r));
    expect(events).toEqual(['setup', 'mounted']);
  });
});

describe('createDerivedSignal', () => {
  it('mirrors a getter so destructured reads stay current', () => {
    const [name, setName] = signal<string | undefined>('Alice');
    const mirrored = createDerivedSignal(() => name(), 'default');

    expect(mirrored()).toBe('Alice');
    setName('Bob');
    flushSync();
    expect(mirrored()).toBe('Bob');
  });

  it('falls back when the getter returns null or undefined', () => {
    const [value, setValue] = signal<string | null | undefined>(undefined);
    const mirrored = createDerivedSignal(() => value(), 'fallback');

    expect(mirrored()).toBe('fallback');
    setValue('real');
    flushSync();
    expect(mirrored()).toBe('real');
    setValue(null);
    flushSync();
    expect(mirrored()).toBe('fallback');
  });
});

describe('show() keepAlive', () => {
  it('keeps both branches in the DOM and toggles visibility', () => {
    const [on, setOn] = signal(false);
    const container = _createElement('div');

    const node = show(
      () => on(),
      () => {
        const el = _createElement('span');
        el.textContent = 'visible';
        return el;
      },
      () => {
        const el = _createElement('span');
        el.textContent = 'fallback';
        return el;
      },
      { keepAlive: true },
    );
    container.appendChild(node);
    flushSync();

    // Falsy start: fallback rendered, no rendered branch yet.
    expect(container.textContent).toContain('fallback');
    expect(container.querySelectorAll('div').length).toBe(1);

    setOn(true);
    flushSync();
    // Both wrappers now exist; rendered is visible, fallback is hidden.
    const wrappers = container.querySelectorAll('div');
    expect(wrappers.length).toBe(2);
    const visibleTexts = Array.from(wrappers)
      .filter((w) => (w as HTMLElement).style.display !== 'none')
      .map((w) => w.textContent);
    expect(visibleTexts).toEqual(['visible']);

    setOn(false);
    flushSync();
    const nowVisible = Array.from(container.querySelectorAll('div'))
      .filter((w) => (w as HTMLElement).style.display !== 'none')
      .map((w) => w.textContent);
    expect(nowVisible).toEqual(['fallback']);
  });

  it('does not re-run render() when the truthy value changes', () => {
    const [count, setCount] = signal(1);
    const calls: number[] = [];
    const container = _createElement('div');

    const node = show(
      () => count(),
      (v) => {
        calls.push(v);
        const el = _createElement('span');
        el.textContent = `v=${v}`;
        return el;
      },
      undefined,
      { keepAlive: true },
    );
    container.appendChild(node);
    flushSync();
    expect(calls).toEqual([1]);

    setCount(2);
    flushSync();
    // keepAlive renders once; users should use signals inside for updates.
    expect(calls).toEqual([1]);
  });
});
