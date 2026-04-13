/**
 * Tests for URL pattern matching and param extraction.
 */

import { describe, it, expect } from 'vitest';
import { compilePath, matchPath, matchRouteTree, parseSegments } from '../src/matching';
import { normalizeRoutes } from '../src/route-definition';
import type { NormalizedRoute } from '../src/types';

// @ts-expect-error - define __DEV__ for tests
globalThis.__DEV__ = true;

describe('parseSegments()', () => {
  it('parses static segments', () => {
    expect(parseSegments('/users/list')).toEqual([
      { type: 'static', value: 'users' },
      { type: 'static', value: 'list' },
    ]);
  });

  it('parses param segments', () => {
    expect(parseSegments('/users/:id')).toEqual([
      { type: 'static', value: 'users' },
      { type: 'param', value: 'id' },
    ]);
  });

  it('parses wildcard segments', () => {
    expect(parseSegments('/files/*')).toEqual([
      { type: 'static', value: 'files' },
      { type: 'wildcard', value: 'wild' },
    ]);
  });

  it('parses root path', () => {
    expect(parseSegments('/')).toEqual([]);
  });
});

describe('compilePath()', () => {
  it('compiles static path', () => {
    const { regex, paramNames } = compilePath('/users');
    expect(paramNames).toEqual([]);
    expect(regex.test('/users')).toBe(true);
    expect(regex.test('/users/')).toBe(true);
    expect(regex.test('/other')).toBe(false);
  });

  it('compiles path with params', () => {
    const { regex, paramNames } = compilePath('/users/:id');
    expect(paramNames).toEqual(['id']);
    expect(regex.test('/users/42')).toBe(true);
    expect(regex.test('/users/abc')).toBe(true);
    expect(regex.test('/users')).toBe(false);
  });

  it('compiles path with multiple params', () => {
    const { regex, paramNames } = compilePath('/users/:id/posts/:postId');
    expect(paramNames).toEqual(['id', 'postId']);
    expect(regex.test('/users/42/posts/99')).toBe(true);
    expect(regex.test('/users/42')).toBe(false);
  });

  it('compiles wildcard path', () => {
    const { regex, paramNames } = compilePath('/files/*');
    expect(paramNames).toEqual(['*']);
    expect(regex.test('/files/a/b/c')).toBe(true);
    expect(regex.test('/files/x')).toBe(true);
  });

  it('compiles root path', () => {
    const { regex } = compilePath('/');
    expect(regex.test('/')).toBe(true);
  });
});

describe('matchRouteTree()', () => {
  function makeRoutes() {
    return normalizeRoutes([
      { path: '/', component: () => document.createElement('div') },
      {
        path: '/users',
        component: () => document.createElement('div'),
        children: [
          { path: '/', component: () => document.createElement('div') },
          { path: '/:id', component: () => document.createElement('div') },
          {
            path: '/:id/posts',
            component: () => document.createElement('div'),
            children: [
              { path: '/:postId', component: () => document.createElement('div') },
            ],
          },
        ],
      },
      { path: '/about', component: () => document.createElement('div') },
    ]);
  }

  it('matches root path', () => {
    const routes = makeRoutes();
    const result = matchRouteTree('/', routes);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0].route.fullPath).toBe('/');
  });

  it('matches static path', () => {
    const routes = makeRoutes();
    const result = matchRouteTree('/about', routes);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0].route.fullPath).toBe('/about');
  });

  it('matches nested route with params', () => {
    const routes = makeRoutes();
    const result = matchRouteTree('/users/42', routes);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    expect(result![0].route.fullPath).toBe('/users');
    expect(result![1].route.fullPath).toBe('/users/:id');
    expect(result![1].params).toEqual({ id: '42' });
  });

  it('matches deeply nested route', () => {
    const routes = makeRoutes();
    const result = matchRouteTree('/users/42/posts/99', routes);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);
    expect(result![0].route.fullPath).toBe('/users');
    expect(result![1].route.fullPath).toBe('/users/:id/posts');
    expect(result![2].route.fullPath).toBe('/users/:id/posts/:postId');
    expect(result![1].params).toEqual({ id: '42' });
    expect(result![2].params).toEqual({ postId: '99' });
  });

  it('returns null for unmatched paths', () => {
    const routes = makeRoutes();
    expect(matchRouteTree('/nonexistent', routes)).toBeNull();
  });

  it('decodes URI-encoded params', () => {
    const routes = makeRoutes();
    const result = matchRouteTree('/users/hello%20world', routes);
    expect(result).not.toBeNull();
    expect(result![1].params.id).toBe('hello world');
  });
});
