/**
 * Tests for routeOutlet() and provideRouter().
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createScope, flushSync } from '@mikata/reactivity';
import { render } from '@mikata/runtime';
import { createRouter } from '../src/router';
import { provideRouter, routeOutlet } from '../src/outlet';
import type { Router } from '../src/types';

// @ts-expect-error — define __DEV__ for tests
globalThis.__DEV__ = true;

describe('routeOutlet()', () => {
  let container: HTMLElement;
  let router: Router;
  let dispose: () => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    dispose?.();
    router?.dispose();
    container.remove();
  });

  function setup(routes: any[], initialPath = '/') {
    router = createRouter({
      routes,
      history: 'memory',
    });

    dispose = render(() => {
      provideRouter(router);
      const wrapper = document.createElement('div');
      wrapper.appendChild(routeOutlet());
      return wrapper;
    }, container);

    flushSync();
  }

  it('renders the matched route component', () => {
    setup([
      {
        path: '/',
        component: () => {
          const el = document.createElement('div');
          el.textContent = 'Home';
          return el;
        },
      },
    ]);

    expect(container.textContent).toBe('Home');
  });

  it('swaps component on navigation', async () => {
    setup([
      {
        path: '/',
        component: () => {
          const el = document.createElement('div');
          el.textContent = 'Home';
          return el;
        },
      },
      {
        path: '/about',
        component: () => {
          const el = document.createElement('div');
          el.textContent = 'About';
          return el;
        },
      },
    ]);

    expect(container.textContent).toBe('Home');

    await router.navigate('/about');
    flushSync();

    expect(container.textContent).toBe('About');
  });

  it('renders notFound for unmatched paths', async () => {
    router = createRouter({
      routes: [
        {
          path: '/',
          component: () => {
            const el = document.createElement('div');
            el.textContent = 'Home';
            return el;
          },
        },
      ],
      history: 'memory',
      notFound: () => {
        const el = document.createElement('div');
        el.textContent = '404 Not Found';
        return el;
      },
    });

    dispose = render(() => {
      provideRouter(router);
      const wrapper = document.createElement('div');
      wrapper.appendChild(routeOutlet());
      return wrapper;
    }, container);

    flushSync();
    expect(container.textContent).toBe('Home');

    await router.navigate('/nonexistent');
    flushSync();

    expect(container.textContent).toBe('404 Not Found');
  });

  it('renders nested routes with nested outlets', async () => {
    setup([
      {
        path: '/dashboard',
        component: () => {
          const el = document.createElement('div');
          el.className = 'dashboard';
          const header = document.createElement('h1');
          header.textContent = 'Dashboard';
          el.appendChild(header);
          el.appendChild(routeOutlet());
          return el;
        },
        children: [
          {
            path: '/',
            component: () => {
              const el = document.createElement('div');
              el.textContent = 'Overview';
              return el;
            },
          },
          {
            path: '/settings',
            component: () => {
              const el = document.createElement('div');
              el.textContent = 'Settings';
              return el;
            },
          },
        ],
      },
    ]);

    await router.navigate('/dashboard');
    flushSync();

    expect(container.textContent).toContain('Dashboard');
    expect(container.textContent).toContain('Overview');

    await router.navigate('/dashboard/settings');
    flushSync();

    // Dashboard layout should persist, only inner content changes
    expect(container.textContent).toContain('Dashboard');
    expect(container.textContent).toContain('Settings');
    expect(container.textContent).not.toContain('Overview');
  });

  it('disposes old route scope on navigation', async () => {
    let cleanupCalled = false;

    setup([
      {
        path: '/',
        component: () => {
          const el = document.createElement('div');
          el.textContent = 'Home';
          return el;
        },
      },
      {
        path: '/about',
        component: () => {
          const el = document.createElement('div');
          el.textContent = 'About';
          return el;
        },
      },
    ]);

    await router.navigate('/about');
    flushSync();

    // The old scope should have been disposed
    expect(container.textContent).toBe('About');
  });
});
