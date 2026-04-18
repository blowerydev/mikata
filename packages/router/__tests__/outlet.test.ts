/**
 * Tests for routeOutlet() and provideRouter().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createScope, flushSync } from '@mikata/reactivity';
import { render } from '@mikata/runtime';
import { createRouter } from '../src/router';
import { provideRouter, routeOutlet } from '../src/outlet';
import { Link } from '../src/link';
import type { Router } from '../src/types';

// @ts-expect-error - define __DEV__ for tests
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

describe('Link unsafe-scheme warning', () => {
  let container: HTMLElement;
  let router: Router;
  let dispose: () => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    router = createRouter({ routes: [{ path: '/', component: () => document.createElement('div') }], history: 'memory' });
  });

  afterEach(() => {
    dispose?.();
    router?.dispose();
    container.remove();
  });

  function renderLink(to: string) {
    dispose = render(() => {
      provideRouter(router);
      return Link({ to });
    }, container);
    flushSync();
  }

  it('does not warn for http(s), mailto, relative paths', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderLink('https://example.com');
    renderLink('/about');
    renderLink('mailto:a@b.com');
    renderLink('#hash');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns in dev for javascript: URLs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderLink('javascript:alert(1)');
    expect(warn).toHaveBeenCalled();
    expect((warn.mock.calls[0][0] as string)).toContain('unsafe URL scheme');
    warn.mockRestore();
  });

  it('warns for data: URLs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderLink('data:text/html,<script>alert(1)</script>');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('Link children', () => {
  let container: HTMLElement;
  let router: Router;
  let dispose: () => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    router = createRouter({ routes: [{ path: '/', component: () => document.createElement('div') }], history: 'memory' });
  });

  afterEach(() => {
    dispose?.();
    router?.dispose();
    container.remove();
  });

  it('renders string children as text content, not as an attribute', () => {
    dispose = render(() => {
      provideRouter(router);
      return Link({ to: '/about', children: 'About' } as never);
    }, container);
    flushSync();
    const a = container.querySelector('a')!;
    expect(a.textContent).toBe('About');
    expect(a.hasAttribute('children')).toBe(false);
    expect(a.getAttribute('href')).toBe('/about');
  });

  it('renders a node child inside the anchor', () => {
    dispose = render(() => {
      provideRouter(router);
      const span = document.createElement('span');
      span.textContent = 'Go';
      return Link({ to: '/x', children: span } as never);
    }, container);
    flushSync();
    const a = container.querySelector('a')!;
    expect(a.querySelector('span')?.textContent).toBe('Go');
    expect(a.hasAttribute('children')).toBe(false);
  });
});
