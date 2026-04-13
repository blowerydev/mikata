/**
 * Tests for the core router (createRouter, navigation, signal state).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from '@mikata/reactivity';
import { createRouter } from '../src/router';
import { searchParam } from '../src/search-params';
import type { Router, MatchedRoute } from '../src/types';

// @ts-expect-error - define __DEV__ for tests
globalThis.__DEV__ = true;

describe('createRouter()', () => {
  let router: Router;

  function makeRouter(initialPath = '/') {
    return createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        {
          path: '/users',
          component: () => document.createElement('div'),
          children: [
            { path: '/', component: () => document.createElement('div') },
            {
              path: '/:id',
              component: () => document.createElement('div'),
              search: {
                tab: searchParam.string('profile'),
              },
            },
          ],
        },
        { path: '/about', component: () => document.createElement('div') },
      ],
      history: 'memory',
    });
  }

  afterEach(() => {
    router?.dispose();
  });

  it('initializes with the current location', () => {
    router = makeRouter();
    expect(router.path()).toBe('/');
    expect(router.params()).toEqual({});
  });

  it('navigates to a path', async () => {
    router = makeRouter();
    await router.navigate('/about');
    expect(router.path()).toBe('/about');
  });

  it('navigates to a path with params', async () => {
    router = makeRouter();
    await router.navigate('/users/42');
    expect(router.path()).toBe('/users/42');
    expect(router.params()).toEqual({ id: '42' });
  });

  it('navigates with structured target', async () => {
    router = makeRouter();
    await router.navigate({ path: '/users/:id', params: { id: 99 } });
    expect(router.path()).toBe('/users/99');
    expect(router.params()).toEqual({ id: '99' });
  });

  it('parses search params from schema', async () => {
    router = makeRouter();
    await router.navigate('/users/42?tab=settings');
    expect(router.searchParams()).toEqual({ tab: 'settings' });
  });

  it('uses default search params when missing', async () => {
    router = makeRouter();
    await router.navigate('/users/42');
    expect(router.searchParams()).toEqual({ tab: 'profile' });
  });

  it('updates search params via setSearchParams', async () => {
    router = makeRouter();
    await router.navigate('/users/42');
    expect(router.searchParams()).toEqual({ tab: 'profile' });

    router.setSearchParams({ tab: 'settings' });
    expect(router.searchParams()).toEqual({ tab: 'settings' });
  });

  it('sets isNavigating during navigation', async () => {
    router = makeRouter();
    expect(router.isNavigating()).toBe(false);

    const promise = router.navigate('/about');
    // isNavigating should be true during the navigation
    // (in this case with no guards it may be very fast)
    await promise;
    expect(router.isNavigating()).toBe(false);
  });

  it('navigates back and forward', async () => {
    router = makeRouter();
    await router.navigate('/about');
    await router.navigate('/users/42');
    expect(router.path()).toBe('/users/42');

    router.back();
    // Memory history updates synchronously
    expect(router.path()).toBe('/about');

    router.forward();
    expect(router.path()).toBe('/users/42');
  });

  it('handles 404 (unmatched) paths', async () => {
    router = makeRouter();
    await router.navigate('/nonexistent');
    expect(router.path()).toBe('/nonexistent');
    expect(router.route().matches.length).toBe(0);
  });

  it('runs global beforeNavigate guard', async () => {
    const guard = vi.fn(() => true as const);
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/about', component: () => document.createElement('div') },
      ],
      history: 'memory',
      beforeNavigate: guard,
    });

    await router.navigate('/about');
    expect(guard).toHaveBeenCalled();
    expect(router.path()).toBe('/about');
  });

  it('blocks navigation when guard returns false', async () => {
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/admin', component: () => document.createElement('div') },
      ],
      history: 'memory',
      beforeNavigate: () => false,
    });

    await router.navigate('/admin');
    expect(router.path()).toBe('/');
  });

  it('redirects when guard returns a path', async () => {
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/login', component: () => document.createElement('div') },
        { path: '/admin', component: () => document.createElement('div') },
      ],
      history: 'memory',
      beforeNavigate: (to) => {
        if (to.path === '/admin') return '/login';
      },
    });

    await router.navigate('/admin');
    expect(router.path()).toBe('/login');
  });

  it('runs afterNavigate callback', async () => {
    const after = vi.fn();
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/about', component: () => document.createElement('div') },
      ],
      history: 'memory',
      afterNavigate: after,
    });

    await router.navigate('/about');
    expect(after).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/about' }),
      expect.objectContaining({ path: '/' })
    );
  });

  it('runs per-route guards', async () => {
    const adminGuard = vi.fn(() => false as const);
    router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        {
          path: '/admin',
          component: () => document.createElement('div'),
          guard: adminGuard,
        },
      ],
      history: 'memory',
    });

    await router.navigate('/admin');
    expect(adminGuard).toHaveBeenCalled();
    expect(router.path()).toBe('/');
  });

  it('navigates with replace option', async () => {
    router = makeRouter();
    await router.navigate('/about');
    await router.navigate('/users/42', { replace: true });
    expect(router.path()).toBe('/users/42');

    router.back();
    // Should go back to /, not /about (because replace was used)
    expect(router.path()).toBe('/');
  });

  it('handles hash in navigation', async () => {
    router = makeRouter();
    await router.navigate('/about#section');
    expect(router.hash()).toBe('section');
  });

  it('merges route metadata', async () => {
    router = createRouter({
      routes: [
        {
          path: '/app',
          component: () => document.createElement('div'),
          meta: { layout: 'main' },
          children: [
            {
              path: '/settings',
              component: () => document.createElement('div'),
              meta: { title: 'Settings' },
            },
          ],
        },
      ],
      history: 'memory',
    });

    await router.navigate('/app/settings');
    expect(router.route().meta).toEqual({ layout: 'main', title: 'Settings' });
  });
});
