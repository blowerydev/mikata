import { describe, it, expect } from 'vitest';
import { createFetchHandler, type EdgeServerEntry } from '../src/adapter-edge';

const DEFAULT_TEMPLATE =
  '<html><body><div id="root"><!--ssr-outlet--></div></body></html>';

function makeReq(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Request {
  return new Request('https://example.test' + path, init);
}

describe('createFetchHandler — SSR path', () => {
  it('splices render output into the template at the outlet marker', async () => {
    const handler = createFetchHandler({
      template: DEFAULT_TEMPLATE,
      serverEntry: {
        render: () => ({ html: '<p>Hello</p>', stateScript: '<script>1</script>' }),
      },
    });
    const res = await handler(makeReq('/'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    const body = await res.text();
    expect(body).toContain('<p>Hello</p><script>1</script>');
    expect(body).not.toContain('<!--ssr-outlet-->');
  });

  it('respects status and custom headers returned from render', async () => {
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: () => ({
          html: 'gone',
          status: 410,
          headers: { 'Cache-Control': 'no-store' },
        }),
      },
    });
    const res = await handler(makeReq('/'));
    expect(res.status).toBe(410);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 500 when render throws without leaking the error body', async () => {
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: () => {
          throw new Error('boom with secret detail');
        },
      },
    });
    const res = await handler(makeReq('/'));
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toBe('Internal Server Error');
    expect(body).not.toContain('secret');
  });

  it('honors a custom outletMarker', async () => {
    const handler = createFetchHandler({
      template: '<body>%APP%</body>',
      serverEntry: { render: () => ({ html: 'X' }) },
      outletMarker: '%APP%',
    });
    const res = await handler(makeReq('/'));
    expect(await res.text()).toBe('<body>X</body>');
  });

  it('splices headTags at the head marker', async () => {
    const handler = createFetchHandler({
      template:
        '<html><head><!--mikata-head--></head><body><!--ssr-outlet--></body></html>',
      serverEntry: {
        render: () => ({ html: 'X', headTags: '<title>T</title>' }),
      },
    });
    const res = await handler(makeReq('/'));
    const body = await res.text();
    expect(body).toContain('<title>T</title>');
    expect(body).not.toContain('<!--mikata-head-->');
  });

  it('passes the inbound Request through to render for POST', async () => {
    let seen: Request | undefined;
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: async (ctx) => {
          seen = ctx.request;
          const form = await ctx.request.formData();
          return { html: `<p>got ${form.get('name')}</p>` };
        },
      },
    });
    const res = await handler(
      makeReq('/contact', {
        method: 'POST',
        body: 'name=Ada',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    );
    expect(seen).toBeInstanceOf(Request);
    expect(seen!.method).toBe('POST');
    expect(await res.text()).toContain('<p>got Ada</p>');
  });

  it('forwards the inbound cookie header to render', async () => {
    let seen: string | null | undefined;
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: (ctx) => {
          seen = ctx.cookieHeader;
          return { html: '' };
        },
      },
    });
    await handler(makeReq('/', { headers: { cookie: 'sid=abc; theme=dark' } }));
    expect(seen).toBe('sid=abc; theme=dark');
  });

  it('passes a null cookieHeader when the request has no Cookie', async () => {
    let seen: string | null | undefined = 'sentinel' as never;
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: (ctx) => {
          seen = ctx.cookieHeader;
          return { html: '' };
        },
      },
    });
    await handler(makeReq('/'));
    expect(seen).toBeNull();
  });

  it('strips the origin from the URL it hands to render', async () => {
    let seen = '';
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: (ctx) => {
          seen = ctx.url;
          return { html: '' };
        },
      },
    });
    await handler(makeReq('/posts/42?draft=1'));
    expect(seen).toBe('/posts/42?draft=1');
  });

  it('forwards redirect results as an HTTP redirect for native submits', async () => {
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: () => ({
          html: '',
          redirect: { url: '/thanks', status: 303 },
        }),
      },
    });
    const res = await handler(makeReq('/contact', { method: 'POST' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/thanks');
  });

  it('replies with JSON for enhanced submits (x-mikata-form header)', async () => {
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: () => ({
          html: 'unused',
          loaderData: { '/contact': { data: { hi: 1 } } },
          actionData: { '/contact': { data: { ok: true } } },
        }),
      },
    });
    const res = await handler(
      makeReq('/contact', {
        method: 'POST',
        headers: { 'x-mikata-form': '1' },
      }),
    );
    expect(res.headers.get('content-type')).toBe(
      'application/json; charset=utf-8',
    );
    const payload = (await res.json()) as {
      loaderData: Record<string, { data: { hi: number } }>;
      actionData: Record<string, { data: { ok: boolean } }>;
    };
    expect(payload.actionData['/contact'].data.ok).toBe(true);
    expect(payload.loaderData['/contact'].data.hi).toBe(1);
  });

  it('replies with JSON redirect for enhanced submits', async () => {
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: () => ({
          html: '',
          redirect: { url: '/thanks', status: 303 },
        }),
      },
    });
    const res = await handler(
      makeReq('/contact', {
        method: 'POST',
        headers: { 'x-mikata-form': '1' },
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('content-type')).toBe(
      'application/json; charset=utf-8',
    );
    const payload = (await res.json()) as { redirect: { url: string; status: number } };
    expect(payload.redirect).toEqual({ url: '/thanks', status: 303 });
  });

  it('emits each setCookies entry as its own Set-Cookie header', async () => {
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: () => ({
          html: '',
          setCookies: [
            'sid=abc; Path=/; HttpOnly',
            'theme=dark; Path=/',
          ],
        }),
      },
    });
    const res = await handler(makeReq('/'));
    // Standard Fetch Headers in Node 20+ expose getSetCookie(); fall back
    // to parsing the combined value for older runtimes.
    const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] })
      .getSetCookie;
    const cookies = typeof getSetCookie === 'function'
      ? getSetCookie.call(res.headers)
      : (res.headers.get('set-cookie') ?? '').split(/,\s*(?=[^;]+=)/);
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('sid=abc');
    expect(cookies[1]).toContain('theme=dark');
  });

  it('includes setCookies on redirect responses too', async () => {
    const handler = createFetchHandler({
      template: '<!--ssr-outlet-->',
      serverEntry: {
        render: () => ({
          html: '',
          redirect: { url: '/next', status: 302 },
          setCookies: ['sid=abc; Path=/'],
        }),
      },
    });
    const res = await handler(makeReq('/login', { method: 'POST' }));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/next');
    const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] })
      .getSetCookie;
    const cookies = typeof getSetCookie === 'function'
      ? getSetCookie.call(res.headers)
      : [res.headers.get('set-cookie') ?? ''];
    expect(cookies.some((c) => c.includes('sid=abc'))).toBe(true);
  });
});

describe('createFetchHandler — API routes', () => {
  function makeHandler(
    apiRoutes: EdgeServerEntry['apiRoutes'],
    renderSpy?: (ctx: { url: string }) => void,
  ) {
    const serverEntry: EdgeServerEntry = {
      render: (ctx) => {
        renderSpy?.(ctx);
        return { html: '<p>page</p>' };
      },
      apiRoutes,
    };
    return createFetchHandler({
      template: '<html><body><!--ssr-outlet--></body></html>',
      serverEntry,
    });
  }

  it('forwards a matching GET API response without rendering a page', async () => {
    let pageRendered = 0;
    const handler = makeHandler(
      [
        {
          path: '/api/ping',
          lazy: async () => ({ GET: () => Response.json({ ok: true }) }),
        },
      ],
      () => {
        pageRendered++;
      },
    );
    const res = await handler(makeReq('/api/ping'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ ok: true });
    expect(pageRendered).toBe(0);
  });

  it('forwards a matching POST API response with the request body', async () => {
    const handler = makeHandler([
      {
        path: '/api/echo',
        lazy: async () => ({
          POST: async (ctx) => {
            const body = await ctx.request.text();
            return new Response(`echo:${body}`, { status: 201 });
          },
        }),
      },
    ]);
    const res = await handler(
      makeReq('/api/echo', {
        method: 'POST',
        body: 'hello',
        headers: { 'content-type': 'text/plain' },
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.text()).toBe('echo:hello');
  });

  it('returns 405 with Allow header when the verb does not match', async () => {
    const handler = makeHandler([
      {
        path: '/api/users',
        lazy: async () => ({ GET: () => Response.json([]) }),
      },
    ]);
    const res = await handler(makeReq('/api/users', { method: 'POST' }));
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET');
  });

  it('falls through to SSR when no API route matches the URL', async () => {
    let rendered = 0;
    const handler = makeHandler(
      [
        {
          path: '/api/other',
          lazy: async () => ({ GET: () => new Response('other') }),
        },
      ],
      () => {
        rendered++;
      },
    );
    const res = await handler(makeReq('/about'));
    expect(rendered).toBe(1);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<p>page</p>');
  });

  it('extracts params from the URL and passes them to the handler', async () => {
    const handler = makeHandler([
      {
        path: '/api/users/:id',
        lazy: async () => ({
          GET: (ctx) => Response.json({ id: ctx.params.id }),
        }),
      },
    ]);
    const res = await handler(makeReq('/api/users/42'));
    expect(await res.json()).toEqual({ id: '42' });
  });
});
