/**
 * Tests for createTestRouter — ergonomic in-memory factory for unit tests.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createTestRouter } from '../src/testing';
import { createMemoryHistory } from '../src/history';
import { createRouter } from '../src/router';
import type { Router } from '../src/types';

// @ts-expect-error — define __DEV__ for tests
globalThis.__DEV__ = true;

describe('createTestRouter()', () => {
  let router: Router;
  afterEach(() => router?.dispose());

  const routes = [
    { path: '/', component: () => document.createElement('div') },
    { path: '/about', component: () => document.createElement('div') },
    { path: '/users/:id', component: () => document.createElement('div') },
  ];

  it('defaults the initial path to /', () => {
    router = createTestRouter(routes);
    expect(router.path()).toBe('/');
  });

  it('starts at the caller-provided path', () => {
    router = createTestRouter(routes, '/about');
    expect(router.path()).toBe('/about');
  });

  it('accepts an options object with initialPath', () => {
    router = createTestRouter(routes, { initialPath: '/users/42' });
    expect(router.path()).toBe('/users/42');
    expect(router.params()).toEqual({ id: '42' });
  });

  it('supports the full navigation surface', async () => {
    router = createTestRouter(routes, '/');
    await router.navigate('/about');
    expect(router.path()).toBe('/about');
  });
});

describe('createRouter with a pre-built HistoryAdapter', () => {
  it('uses the adapter directly', () => {
    const history = createMemoryHistory('/about');
    const router = createRouter({
      routes: [
        { path: '/', component: () => document.createElement('div') },
        { path: '/about', component: () => document.createElement('div') },
      ],
      history,
    });
    expect(router.path()).toBe('/about');
    router.dispose();
  });
});
