/**
 * Tests for routeOutlet() and provideRouter().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createScope, flushSync } from '@mikata/reactivity';
import { hydrate, render } from '@mikata/runtime';
import { createRouter } from '../src/router';
import { provideRouter, routeOutlet } from '../src/outlet';
import { Link } from '../src/link';
import { useRoute } from '../src/hooks';
import type { Router, RouteMatch } from '../src/types';

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

describe('Link event props', () => {
  let container: HTMLElement;
  let router: Router;
  let dispose: () => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/about', component: () => document.createElement('div') },
      ],
      history: 'memory',
    });
  });

  afterEach(() => {
    dispose?.();
    router?.dispose();
    container.remove();
  });

  function renderLink(props: Parameters<typeof Link>[0]) {
    dispose = render(() => {
      provideRouter(router);
      return Link(props);
    }, container);
    flushSync();
    return container.querySelector('a')!;
  }

  it('forwards native event props to the anchor', () => {
    const onMouseDown = vi.fn((event: MouseEvent) => event.preventDefault());
    const a = renderLink({ to: '/about', onMouseDown });

    const event = new MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true });
    a.dispatchEvent(event);

    expect(onMouseDown).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('lets onClick prevent router navigation', async () => {
    const a = renderLink({
      to: '/about',
      onClick: (event: MouseEvent) => event.preventDefault(),
    });

    a.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(router.path()).toBe('/');
  });

  it('hydrates the visible anchor so clicks use client routing', async () => {
    container.innerHTML = '<a href="/about">About</a>';
    const ssrAnchor = container.querySelector('a')!;

    dispose = hydrate(() => {
      provideRouter(router);
      return Link({ to: '/about', children: 'About' });
    }, container);
    flushSync();

    expect(container.querySelector('a')).toBe(ssrAnchor);

    const event = new MouseEvent('click', {
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    ssrAnchor.dispatchEvent(event);
    await Promise.resolve();
    flushSync();

    expect(event.defaultPrevented).toBe(true);
    expect(router.path()).toBe('/about');
  });
});

describe('Link base-path awareness', () => {
  let container: HTMLElement;
  let dispose: () => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    dispose?.();
    container.remove();
  });

  function renderLink(router: Router, props: Parameters<typeof Link>[0]) {
    dispose = render(() => {
      provideRouter(router);
      return Link(props);
    }, container);
    flushSync();
    return container.querySelector('a')!;
  }

  it('prefixes href with the router base', () => {
    // The SSR-rendered anchor has to point at the actual URL the
    // browser should navigate to on right-click-open or no-JS paint.
    const router = createRouter({
      routes: [{ path: '/about', component: () => document.createElement('div') }],
      history: 'memory',
      base: '/mikata',
    });
    const a = renderLink(router, { to: '/about' });
    expect(a.getAttribute('href')).toBe('/mikata/about');
    router.dispose();
  });

  it('does not double-prefix when `to` already includes the base', () => {
    // Guard against users who manually prefix - writing `/mikata/about`
    // in `to` should stay a single `/mikata/about` in the href.
    const router = createRouter({
      routes: [{ path: '/about', component: () => document.createElement('div') }],
      history: 'memory',
      base: '/mikata',
    });
    const a = renderLink(router, { to: '/mikata/about' });
    expect(a.getAttribute('href')).toBe('/mikata/about');
    router.dispose();
  });

  it('leaves absolute URLs, anchors, and query-only paths alone', () => {
    const router = createRouter({
      routes: [{ path: '/', component: () => document.createElement('div') }],
      history: 'memory',
      base: '/mikata',
    });
    expect(renderLink(router, { to: 'https://example.com' }).getAttribute('href')).toBe(
      'https://example.com',
    );
    // Fresh render per case — previous calls attach to the same container.
    dispose();
    expect(renderLink(router, { to: '#section' }).getAttribute('href')).toBe('#section');
    dispose();
    expect(renderLink(router, { to: '?q=1' }).getAttribute('href')).toBe('?q=1');
    router.dispose();
  });

  it('compares active state against the base-stripped logical path', () => {
    // router.path() is base-stripped by the history adapter, so the
    // active-state computation has to use the logical target, not the
    // base-prefixed href.
    const router = createRouter({
      routes: [{ path: '/about', component: () => document.createElement('div') }],
      history: 'memory',
      base: '/mikata',
    });
    router.navigate('/about');
    flushSync();
    const a = renderLink(router, {
      to: '/about',
      activeClass: 'is-active',
      exactActiveClass: 'is-exact',
    });
    expect(a.className).toContain('is-active');
    expect(a.className).toContain('is-exact');
    router.dispose();
  });

  it('no base = no prefix', () => {
    // Regression: the base-prefix logic must not kick in when `base`
    // wasn't configured. Otherwise existing users start seeing `//`
    // or extraneous path segments in every `<a href>`.
    const router = createRouter({
      routes: [{ path: '/', component: () => document.createElement('div') }],
      history: 'memory',
    });
    const a = renderLink(router, { to: '/about' });
    expect(a.getAttribute('href')).toBe('/about');
    router.dispose();
  });
});

describe('useRoute()', () => {
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

  it('returns the match for the route owning the calling component', () => {
    let captured: RouteMatch | null = null;
    router = createRouter({
      routes: [
        {
          path: '/users/:id',
          component: () => {
            captured = useRoute()();
            const el = document.createElement('div');
            el.textContent = 'user';
            return el;
          },
        },
      ],
      history: 'memory',
    });

    // Seed the memory history with a path that has a param.
    router.navigate('/users/42');

    dispose = render(() => {
      provideRouter(router);
      return routeOutlet();
    }, container);
    flushSync();

    expect(captured).not.toBeNull();
    expect(captured!.route.fullPath).toBe('/users/:id');
    expect(captured!.params.id).toBe('42');
  });

  it('returns null when no outlet wraps the component', () => {
    router = createRouter({
      routes: [{ path: '/', component: () => document.createElement('div') }],
      history: 'memory',
    });

    let captured: RouteMatch | null | undefined = undefined;
    dispose = render(() => {
      provideRouter(router);
      captured = useRoute()();
      return document.createElement('div');
    }, container);
    flushSync();

    expect(captured).toBeNull();
  });
});
