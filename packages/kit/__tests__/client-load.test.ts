import { describe, it, expect } from 'vitest';
import { _template, _insert, _createComponent } from '@mikata/runtime';
import { mount } from '../src/client';
import { useLoaderData, LOADER_DATA_GLOBAL, type LoadContext } from '../src/loader';

// The client entry reads embedded loader data off the window; reset
// between tests so earlier state doesn't leak in.
function resetGlobal(data: Record<string, unknown> | undefined) {
  if (data === undefined) {
    delete (window as any)[LOADER_DATA_GLOBAL];
  } else {
    (window as any)[LOADER_DATA_GLOBAL] = data;
  }
}

// Poll a predicate — the client's loader effect defers via
// queueMicrotask, and loaders themselves are async, so we yield a few
// ticks before reading.
async function waitUntil(predicate: () => boolean, maxMs = 500): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > maxMs) throw new Error('waitUntil timeout');
    await new Promise((r) => setTimeout(r, 0));
  }
}

// Minimal consumer that renders the current useLoaderData into a
// single text node — lets us assert the store's value through the DOM.
function IdConsumer() {
  const data = useLoaderData<() => Promise<{ id: string }>>();
  const root = _template('<p><!></p>').cloneNode(true) as any;
  _insert(root, () => data()?.id ?? '…', root.childNodes[0]);
  return root;
}

describe('client-side load() re-runs', () => {
  it('re-invokes load on navigation and updates useLoaderData reactively', async () => {
    const calls: string[] = [];
    const routes = [
      {
        path: '/users/:id',
        lazy: async () => ({
          default: () => _createComponent(IdConsumer, {}),
          load: async ({ params }: LoadContext) => {
            calls.push(params.id);
            return { id: params.id };
          },
        }),
      },
    ];

    resetGlobal({ '/users/:id': { id: '1' } });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { router, dispose } = mount(routes, container, { history: 'memory' });
    await router.navigate('/users/1');
    await waitUntil(() => container.textContent?.includes('1') ?? false);
    // Seeded data was `{id:'1'}` and the URL matches — the loader
    // still re-runs for the first match (there's no server-provided
    // keying to tell us it's already fresh), but the result should be
    // the same `'1'`.
    expect(container.textContent).toContain('1');

    calls.length = 0;
    await router.navigate('/users/2');
    await waitUntil(() => container.textContent?.includes('2') ?? false);
    expect(container.textContent).toContain('2');
    expect(container.textContent).not.toContain('1');
    expect(calls).toEqual(['2']);

    dispose();
    container.remove();
    resetGlobal(undefined);
  });

  it('suppresses stale loader responses via per-path sequence counter', async () => {
    // Controllable loader — each load() call registers its resolver
    // under the param id so the test can decide resolution order.
    const gate: Record<string, (v: { id: string }) => void> = {};
    const routes = [
      {
        path: '/users/:id',
        lazy: async () => ({
          default: () => _createComponent(IdConsumer, {}),
          load: ({ params }: LoadContext) =>
            new Promise<{ id: string }>((resolve) => {
              gate[params.id] = resolve;
            }),
        }),
      },
    ];

    resetGlobal({});

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { router, dispose } = mount(routes, container, { history: 'memory' });

    // Kick off /1's loader but leave it unresolved.
    await router.navigate('/users/1');
    await waitUntil(() => typeof gate['1'] === 'function');

    // Navigate to /2 while /1 is still pending — a stale-unaware
    // implementation would then let /1's eventual resolve clobber /2.
    await router.navigate('/users/2');
    await waitUntil(() => typeof gate['2'] === 'function');

    // Resolve /2 (the current route) first, let the store update.
    gate['2']({ id: '2' });
    await waitUntil(() => container.textContent?.includes('2') ?? false);
    expect(container.textContent).toContain('2');

    // Now resolve the stale /1. Its generation is behind /2's, so the
    // store must ignore it and the DOM must still show '2'.
    gate['1']({ id: '1' });
    await new Promise((r) => setTimeout(r, 20));
    expect(container.textContent).toContain('2');
    expect(container.textContent).not.toContain('1');

    dispose();
    container.remove();
    resetGlobal(undefined);
  });
});
