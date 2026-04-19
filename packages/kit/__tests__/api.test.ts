import { describe, it, expect } from 'vitest';
import {
  dispatchApiRoute,
  type ApiRouteDefinition,
  type ApiHandler,
} from '../src/api';

function route(
  path: string,
  handlers: Record<string, ApiHandler>,
): ApiRouteDefinition {
  return {
    path,
    lazy: async () => handlers,
  };
}

function req(url = 'http://localhost/api/ping', method = 'GET'): Request {
  return new Request(url, { method });
}

describe('dispatchApiRoute', () => {
  it('returns null when no route matches', async () => {
    const result = await dispatchApiRoute(
      '/nope',
      'GET',
      [route('/api/ping', { GET: () => new Response('pong') })],
      req('http://localhost/nope'),
    );
    expect(result).toBeNull();
  });

  it('dispatches to the matching verb handler', async () => {
    const result = await dispatchApiRoute(
      '/api/ping',
      'GET',
      [route('/api/ping', { GET: () => new Response('pong') })],
      req('http://localhost/api/ping'),
    );
    expect(result).not.toBeNull();
    expect(await result!.text()).toBe('pong');
  });

  it('passes params extracted from the URL to the handler', async () => {
    let seen: Record<string, string> | null = null;
    const result = await dispatchApiRoute(
      '/api/users/42',
      'GET',
      [
        route('/api/users/:id', {
          GET: (ctx) => {
            seen = ctx.params;
            return Response.json({ id: ctx.params.id });
          },
        }),
      ],
      req('http://localhost/api/users/42'),
    );
    expect(seen).toEqual({ id: '42' });
    expect(await result!.json()).toEqual({ id: '42' });
  });

  it('decodes URL-encoded params', async () => {
    let seen = '';
    await dispatchApiRoute(
      '/api/search/hello%20world',
      'GET',
      [
        route('/api/search/:q', {
          GET: (ctx) => {
            seen = ctx.params.q!;
            return new Response();
          },
        }),
      ],
      req('http://localhost/api/search/hello%20world'),
    );
    expect(seen).toBe('hello world');
  });

  it('captures catch-all segments as the `*` param', async () => {
    let seen = '';
    await dispatchApiRoute(
      '/api/files/a/b/c',
      'GET',
      [
        route('/api/files/*', {
          GET: (ctx) => {
            seen = ctx.params['*']!;
            return new Response();
          },
        }),
      ],
      req('http://localhost/api/files/a/b/c'),
    );
    expect(seen).toBe('a/b/c');
  });

  it('returns 405 with an Allow header when the path matches but the verb does not', async () => {
    const result = await dispatchApiRoute(
      '/api/users',
      'DELETE',
      [
        route('/api/users', {
          GET: () => new Response(),
          POST: () => new Response(),
        }),
      ],
      req('http://localhost/api/users', 'DELETE'),
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(405);
    const allow = result!.headers.get('Allow');
    expect(allow).toBeTruthy();
    const verbs = allow!.split(', ').sort();
    expect(verbs).toEqual(['GET', 'POST']);
  });

  it('normalises method casing', async () => {
    const result = await dispatchApiRoute(
      '/api/ping',
      'get',
      [route('/api/ping', { GET: () => new Response('pong') })],
      req('http://localhost/api/ping'),
    );
    expect(await result!.text()).toBe('pong');
  });

  it('works with absolute URLs as the url argument', async () => {
    const result = await dispatchApiRoute(
      'http://example.com/api/ping?q=1',
      'GET',
      [route('/api/ping', { GET: () => new Response('pong') })],
      req('http://example.com/api/ping?q=1'),
    );
    expect(await result!.text()).toBe('pong');
  });

  it('tries routes in order and short-circuits on the first match', async () => {
    let firstCalls = 0;
    let secondCalls = 0;
    const result = await dispatchApiRoute(
      '/api/ping',
      'GET',
      [
        route('/api/ping', {
          GET: () => {
            firstCalls++;
            return new Response('first');
          },
        }),
        route('/api/ping', {
          GET: () => {
            secondCalls++;
            return new Response('second');
          },
        }),
      ],
      req('http://localhost/api/ping'),
    );
    expect(await result!.text()).toBe('first');
    expect(firstCalls).toBe(1);
    expect(secondCalls).toBe(0);
  });

  it('propagates handler-thrown errors to the caller', async () => {
    const boom = new Error('boom');
    await expect(
      dispatchApiRoute(
        '/api/broken',
        'GET',
        [
          route('/api/broken', {
            GET: () => {
              throw boom;
            },
          }),
        ],
        req('http://localhost/api/broken'),
      ),
    ).rejects.toBe(boom);
  });

  it('lazily loads the module only when the route matches', async () => {
    let loaded = 0;
    const result = await dispatchApiRoute(
      '/api/ping',
      'GET',
      [
        {
          path: '/api/other',
          lazy: async () => {
            loaded++;
            return { GET: () => new Response('other') };
          },
        },
        {
          path: '/api/ping',
          lazy: async () => {
            loaded++;
            return { GET: () => new Response('pong') };
          },
        },
      ],
      req('http://localhost/api/ping'),
    );
    expect(await result!.text()).toBe('pong');
    // Only the second route's module should have been loaded.
    expect(loaded).toBe(1);
  });

  it('exposes the full url + inbound Request to the handler', async () => {
    let seenUrl = '';
    let seenRequest: Request | null = null;
    const inbound = req('http://localhost/api/echo?x=1');
    await dispatchApiRoute(
      '/api/echo?x=1',
      'GET',
      [
        route('/api/echo', {
          GET: (ctx) => {
            seenUrl = ctx.url;
            seenRequest = ctx.request;
            return new Response();
          },
        }),
      ],
      inbound,
    );
    expect(seenUrl).toBe('/api/echo?x=1');
    expect(seenRequest).toBe(inbound);
  });
});
