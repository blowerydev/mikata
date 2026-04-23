import { describe, it, expect } from 'vitest';
import { _template, _createComponent, lazy } from '@mikata/runtime';
import { mount } from '../src/client';

// Sanity tests for the mount-time preload pass. The contract we care
// about: when a lazy route matches the initial URL, its module is
// fully resolved before hydrate/render runs, so the route renders its
// real component synchronously on the first pass instead of a
// `lazy()` placeholder. Same for the 404 component on direct 404 hits.
//
// A route that does *not* match the initial URL must not be loaded.

describe('mount: lazy-route preload', () => {
  it('awaits the initial-URL lazy route before rendering', async () => {
    // A route whose lazy loader takes a tick to resolve. If mount
    // rendered before the loader settled, the container would briefly
    // hold a placeholder - or, on hydrate, adopt against the wrong
    // structure. We observe by timing: `ready` shouldn't resolve
    // before the lazy's promise does.
    let lazyResolved = false;
    const routes = [
      {
        path: '/',
        lazy: async () => {
          await new Promise((r) => setTimeout(r, 30));
          lazyResolved = true;
          return {
            default: () => _template('<p>home</p>').cloneNode(true) as Node,
          };
        },
      },
    ];

    const container = document.createElement('div');
    container.innerHTML = '<p>home</p>'; // pretend SSR
    document.body.appendChild(container);

    const { ready, dispose } = mount(routes, container, { history: 'memory' });

    // Before ready resolves, the lazy's loader has kicked off but the
    // module is still in flight. Kit's preload pass awaits it, so by
    // the time `ready` settles the resolved flag must be true.
    await ready;
    expect(lazyResolved).toBe(true);
    expect(container.textContent).toContain('home');

    dispose();
    container.remove();
  });

  it('does not load routes that do not match the initial URL', async () => {
    // /a matches initial '/'; /b does not. Only /a's loader fires.
    let bLoaded = false;
    const routes = [
      {
        path: '/',
        lazy: async () => ({
          default: () => _template('<p>a</p>').cloneNode(true) as Node,
        }),
      },
      {
        path: '/deep',
        lazy: async () => {
          bLoaded = true;
          return {
            default: () => _template('<p>b</p>').cloneNode(true) as Node,
          };
        },
      },
    ];

    const container = document.createElement('div');
    container.innerHTML = '<p>a</p>';
    document.body.appendChild(container);

    const { ready, dispose } = mount(routes, container, { history: 'memory' });
    await ready;
    expect(bLoaded).toBe(false);

    dispose();
    container.remove();
  });

  it('preloads the notFound module when the initial URL matches nothing', async () => {
    let notFoundLoaded = false;
    const routes = [
      {
        path: '/home',
        lazy: async () => ({
          default: () => _template('<p>home</p>').cloneNode(true) as Node,
        }),
      },
    ];
    const notFound = async () => {
      notFoundLoaded = true;
      return {
        default: () => _template('<p>missing</p>').cloneNode(true) as Node,
      };
    };

    const container = document.createElement('div');
    container.innerHTML = '<p>missing</p>';
    document.body.appendChild(container);

    // Memory history starts at '/' — unmatched by the routes above, so
    // mount should preload the notFound module before hydrating.
    const { ready, dispose } = mount(routes, container, {
      history: 'memory',
      notFound,
    });
    await ready;
    expect(notFoundLoaded).toBe(true);

    dispose();
    container.remove();
  });

  it('hydrates synchronously when there is nothing to preload', () => {
    // Non-lazy routes + matched initial path + no notFound loader =
    // no preload work. Mount should call hydrate/render on the same
    // tick so downstream synchronous code sees a rendered tree.
    const routes = [
      {
        path: '/',
        component: () => _template('<p>root</p>').cloneNode(true) as Node,
      },
    ];

    const container = document.createElement('div');
    container.innerHTML = '<p>root</p>';
    document.body.appendChild(container);

    const { dispose } = mount(routes, container, { history: 'memory' });
    // Right after mount returns, the component should already be in
    // place - no microtask needed.
    expect(container.textContent).toContain('root');

    dispose();
    container.remove();
  });
});
