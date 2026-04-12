import { describe, it, expect, vi } from 'vitest';
import { signal, effect, reactive, computed, flushSync } from '@mikata/reactivity';
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
  createContext,
  provide,
  inject,
  onMount,
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

    // Swap handler — the old one must be removed so the click only fires B.
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
