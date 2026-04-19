import { describe, it, expect } from 'vitest';
import { _template, _insert, _createComponent, ErrorBoundary } from '@mikata/runtime';
import {
  createActionStore,
  provideActionData,
  useActionData,
  redirect,
  ACTION_DATA_GLOBAL,
} from '../src/action';
import { mount } from '../src/client';

// Minimal consumer that renders the current useActionData into a
// single text node — lets us assert store values through the DOM.
function ResultConsumer() {
  const result = useActionData<() => Promise<{ ok: boolean }>>();
  const root = _template('<p><!></p>').cloneNode(true) as any;
  _insert(
    root,
    () => (result() ? (result()!.ok ? 'saved' : 'failed') : 'idle'),
    root.childNodes[0],
  );
  return root;
}

function ErrorConsumer() {
  const fallback = (err: Error) => {
    const p = document.createElement('p');
    p.setAttribute('class', 'err');
    p.textContent = err.message;
    return p;
  };
  return _createComponent(ErrorBoundary, {
    fallback,
    get children() {
      return _createComponent(ResultConsumer, {});
    },
  });
}

describe('createActionStore', () => {
  it('seeds from initial data', () => {
    const store = createActionStore({ '/x': { data: { ok: true } } });
    expect(store.data()['/x']).toEqual({ data: { ok: true } });
  });

  it('set() writes a success entry', () => {
    const store = createActionStore({});
    store.set('/x', { saved: 1 });
    expect(store.data()['/x']).toEqual({ data: { saved: 1 } });
  });

  it('setError() serialises Error instances to message + name', () => {
    const store = createActionStore({});
    const err = new TypeError('bad input');
    store.setError('/x', err);
    expect(store.data()['/x']).toEqual({
      error: { message: 'bad input', name: 'TypeError' },
    });
  });

  it('setError() stringifies non-Error throws', () => {
    const store = createActionStore({});
    store.setError('/x', 'plain string');
    expect(store.data()['/x']).toEqual({
      error: { message: 'plain string', name: 'Error' },
    });
  });

  it('clear() drops every entry', () => {
    const store = createActionStore({ '/a': { data: 1 }, '/b': { data: 2 } });
    store.clear();
    expect(store.data()).toEqual({});
  });

  it('data() is reactive — updates flow through the signal', () => {
    const store = createActionStore({});
    const seen: unknown[] = [];
    // Pull the signal once, then inspect after each mutation. Signals
    // are accessors; calling them again always yields the latest value.
    store.set('/x', 1);
    seen.push(store.data()['/x']);
    store.set('/x', 2);
    seen.push(store.data()['/x']);
    store.clear();
    seen.push(store.data()['/x']);
    expect(seen).toEqual([{ data: 1 }, { data: 2 }, undefined]);
  });
});

describe('redirect()', () => {
  it('returns a Response with Location + default status 302', () => {
    const res = redirect('/home');
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/home');
  });

  it('accepts a custom status', () => {
    const res = redirect('/after', 303);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/after');
  });
});

describe('useActionData (end-to-end through mount)', () => {
  it('returns undefined when no action has fired for the current route', async () => {
    delete (window as any)[ACTION_DATA_GLOBAL];
    const routes = [
      {
        path: '/',
        lazy: async () => ({ default: () => _createComponent(ResultConsumer, {}) }),
      },
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { dispose } = mount(routes, container, { history: 'memory' });
    await waitUntil(() => container.textContent === 'idle');
    expect(container.textContent).toBe('idle');
    dispose();
    container.remove();
  });

  it('exposes server-embedded action data on first render', async () => {
    (window as any)[ACTION_DATA_GLOBAL] = {
      '/': { data: { ok: true } },
    };
    const routes = [
      {
        path: '/',
        lazy: async () => ({ default: () => _createComponent(ResultConsumer, {}) }),
      },
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { dispose } = mount(routes, container, { history: 'memory' });
    await waitUntil(() => container.textContent === 'saved');
    expect(container.textContent).toBe('saved');
    dispose();
    container.remove();
    delete (window as any)[ACTION_DATA_GLOBAL];
  });

  it('rethrows as an Error so a parent ErrorBoundary catches it', async () => {
    (window as any)[ACTION_DATA_GLOBAL] = {
      '/': { error: { message: 'nope', name: 'ValidationError' } },
    };
    const routes = [
      {
        path: '/',
        lazy: async () => ({ default: () => _createComponent(ErrorConsumer, {}) }),
      },
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { dispose } = mount(routes, container, { history: 'memory' });
    await waitUntil(() => container.querySelector('.err') !== null);
    const errEl = container.querySelector('.err');
    expect(errEl?.textContent).toBe('nope');
    dispose();
    container.remove();
    delete (window as any)[ACTION_DATA_GLOBAL];
  });
});

// provideActionData must be called inside a component setup, so we
// exercise both call shapes via a route module that's mounted.
describe('provideActionData', () => {
  it('accepts a plain data map', async () => {
    delete (window as any)[ACTION_DATA_GLOBAL];
    const Page = () => {
      // Re-seed the context inside a fresh scope with a literal map —
      // the mount() path normally hands a store, this confirms the
      // data-map call shape still reaches useActionData().
      provideActionData({ '/': { data: { ok: true } } });
      return _createComponent(ResultConsumer, {});
    };
    const routes = [
      { path: '/', lazy: async () => ({ default: () => _createComponent(Page, {}) }) },
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { dispose } = mount(routes, container, { history: 'memory' });
    await waitUntil(() => container.textContent === 'saved');
    dispose();
    container.remove();
  });
});

// Poll a predicate — the client's mount effect defers via
// queueMicrotask and lazy modules resolve asynchronously, so we yield
// ticks before reading.
async function waitUntil(predicate: () => boolean, maxMs = 500): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > maxMs) throw new Error('waitUntil timeout');
    await new Promise((r) => setTimeout(r, 0));
  }
}
