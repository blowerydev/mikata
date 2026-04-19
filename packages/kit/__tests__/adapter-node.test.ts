import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { createRequestHandler } from '../src/adapter-node';
import type { ServerEntry } from '../src/adapter-node';

type FakeRes = PassThrough & {
  statusCode: number;
  _headers: Record<string, string>;
  setHeader: (k: string, v: string) => void;
  body: string;
};

function makeReq(
  url: string,
  method = 'GET',
  options: { body?: string; headers?: Record<string, string> } = {},
) {
  const stream = options.body != null
    ? Readable.from([Buffer.from(options.body)])
    : Readable.from([]);
  Object.assign(stream, {
    url,
    method,
    headers: options.headers ?? {},
  });
  return stream as never;
}

function makeRes(): FakeRes {
  const chunks: Buffer[] = [];
  const stream = new PassThrough();
  stream.on('data', (c: Buffer) => chunks.push(c));
  const res = stream as unknown as FakeRes;
  res.statusCode = 0;
  res._headers = {};
  res.setHeader = (k, v) => {
    res._headers[k.toLowerCase()] = v;
  };
  Object.defineProperty(res, 'body', {
    get: () => Buffer.concat(chunks).toString('utf-8'),
  });
  return res;
}

async function waitFinish(res: FakeRes): Promise<void> {
  if ((res as unknown as { writableEnded: boolean }).writableEnded) return;
  await new Promise<void>((resolve) => res.once('finish', () => resolve()));
}

const tempRoots: string[] = [];
afterEach(async () => {
  while (tempRoots.length) {
    await fs.rm(tempRoots.pop()!, { recursive: true, force: true });
  }
});

async function mkClientDir(files: Record<string, string>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mikata-adapter-test-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(root, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }
  tempRoots.push(root);
  return root;
}

describe('createRequestHandler — SSR path', () => {
  it('splices render output into the template at the outlet marker', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<html><body><div id="root"><!--ssr-outlet--></div></body></html>',
    });
    const serverEntry: ServerEntry = {
      render: () => ({ html: '<p>Hello</p>', stateScript: '<script>1</script>' }),
    };
    const handler = createRequestHandler({ clientDir, serverEntry });
    const res = makeRes();
    await handler(makeReq('/'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(200);
    expect(res._headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.body).toContain('<p>Hello</p><script>1</script>');
    expect(res.body).not.toContain('<!--ssr-outlet-->');
  });

  it('respects status and custom headers returned from render', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<!--ssr-outlet-->',
    });
    const serverEntry: ServerEntry = {
      render: () => ({
        html: 'gone',
        status: 410,
        headers: { 'Cache-Control': 'no-store' },
      }),
    };
    const handler = createRequestHandler({ clientDir, serverEntry });
    const res = makeRes();
    await handler(makeReq('/'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(410);
    expect(res._headers['cache-control']).toBe('no-store');
  });

  it('returns 500 when render throws without leaking the error body', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<!--ssr-outlet-->',
    });
    const serverEntry: ServerEntry = {
      render: () => {
        throw new Error('boom with secret detail');
      },
    };
    const handler = createRequestHandler({ clientDir, serverEntry });
    const res = makeRes();
    await handler(makeReq('/'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toBe('Internal Server Error');
    expect(res.body).not.toContain('secret');
  });

  it('honors a custom outletMarker', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<body>%APP%</body>',
    });
    const serverEntry: ServerEntry = {
      render: () => ({ html: 'X' }),
    };
    const handler = createRequestHandler({
      clientDir,
      serverEntry,
      outletMarker: '%APP%',
    });
    const res = makeRes();
    await handler(makeReq('/'), res as never);
    await waitFinish(res);
    expect(res.body).toBe('<body>X</body>');
  });

  it('builds a Request for POST and passes it to the server entry', async () => {
    const clientDir = await mkClientDir({ 'index.html': '<!--ssr-outlet-->' });
    let seenRequest: Request | undefined;
    const serverEntry: ServerEntry = {
      render: async (ctx) => {
        seenRequest = ctx.request;
        const form = await ctx.request!.formData();
        return { html: `<p>got ${form.get('name')}</p>` };
      },
    };
    const handler = createRequestHandler({ clientDir, serverEntry });
    const res = makeRes();
    await handler(
      makeReq('/contact', 'POST', {
        body: 'name=Ada',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
      res as never,
    );
    await waitFinish(res);
    expect(seenRequest).toBeInstanceOf(Request);
    expect(seenRequest!.method).toBe('POST');
    expect(res.body).toContain('<p>got Ada</p>');
  });

  it('forwards redirect results as an HTTP redirect for native submits', async () => {
    const clientDir = await mkClientDir({ 'index.html': '<!--ssr-outlet-->' });
    const serverEntry: ServerEntry = {
      render: () => ({
        html: '',
        redirect: { url: '/thanks', status: 303 },
      }),
    };
    const handler = createRequestHandler({ clientDir, serverEntry });
    const res = makeRes();
    await handler(makeReq('/contact', 'POST'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(303);
    expect(res._headers['location']).toBe('/thanks');
  });

  it('replies with JSON for enhanced submits (X-Mikata-Form header)', async () => {
    const clientDir = await mkClientDir({ 'index.html': '<!--ssr-outlet-->' });
    const serverEntry: ServerEntry = {
      render: () => ({
        html: 'unused',
        loaderData: { '/contact': { data: { hi: 1 } } },
        actionData: { '/contact': { data: { ok: true } } },
      }),
    };
    const handler = createRequestHandler({ clientDir, serverEntry });
    const res = makeRes();
    await handler(
      makeReq('/contact', 'POST', { headers: { 'x-mikata-form': '1' } }),
      res as never,
    );
    await waitFinish(res);
    expect(res._headers['content-type']).toBe('application/json; charset=utf-8');
    const payload = JSON.parse(res.body);
    expect(payload.actionData['/contact'].data.ok).toBe(true);
    expect(payload.loaderData['/contact'].data.hi).toBe(1);
  });

  it('replies with JSON redirect for enhanced submits', async () => {
    const clientDir = await mkClientDir({ 'index.html': '<!--ssr-outlet-->' });
    const serverEntry: ServerEntry = {
      render: () => ({
        html: '',
        redirect: { url: '/thanks', status: 303 },
      }),
    };
    const handler = createRequestHandler({ clientDir, serverEntry });
    const res = makeRes();
    await handler(
      makeReq('/contact', 'POST', { headers: { 'x-mikata-form': '1' } }),
      res as never,
    );
    await waitFinish(res);
    expect(res.statusCode).toBe(303);
    expect(res._headers['content-type']).toBe('application/json; charset=utf-8');
    const payload = JSON.parse(res.body);
    expect(payload.redirect).toEqual({ url: '/thanks', status: 303 });
  });
});

describe('createRequestHandler — API routes', () => {
  async function setupApi(
    apiRoutes: ServerEntry['apiRoutes'],
    renderSpy?: (ctx: { url: string }) => void,
  ): Promise<ReturnType<typeof createRequestHandler>> {
    const clientDir = await mkClientDir({
      'index.html': '<html><body><!--ssr-outlet--></body></html>',
    });
    const serverEntry: ServerEntry = {
      render: (ctx) => {
        renderSpy?.(ctx);
        return { html: '<p>page</p>' };
      },
      apiRoutes,
    };
    return createRequestHandler({ clientDir, serverEntry });
  }

  it('forwards a matching GET API response without rendering a page', async () => {
    let pageRendered = 0;
    const handler = await setupApi(
      [
        {
          path: '/api/ping',
          lazy: async () => ({
            GET: () => Response.json({ ok: true }),
          }),
        },
      ],
      () => {
        pageRendered++;
      },
    );
    const res = makeRes();
    await handler(makeReq('/api/ping'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(200);
    expect(res._headers['content-type']).toContain('application/json');
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(pageRendered).toBe(0);
  });

  it('forwards a matching POST API response with the request body', async () => {
    const handler = await setupApi([
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
    const res = makeRes();
    await handler(
      makeReq('/api/echo', 'POST', {
        body: 'hello',
        headers: { 'content-type': 'text/plain' },
      }),
      res as never,
    );
    await waitFinish(res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toBe('echo:hello');
  });

  it('returns 405 with Allow header when the verb does not match', async () => {
    const handler = await setupApi([
      {
        path: '/api/users',
        lazy: async () => ({
          GET: () => Response.json([]),
        }),
      },
    ]);
    const res = makeRes();
    await handler(makeReq('/api/users', 'POST'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(405);
    expect(res._headers['allow']).toBe('GET');
  });

  it('falls through to SSR when no API route matches the URL', async () => {
    let rendered = 0;
    const handler = await setupApi(
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
    const res = makeRes();
    await handler(makeReq('/about'), res as never);
    await waitFinish(res);
    expect(rendered).toBe(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<p>page</p>');
  });

  it('extracts params from the URL and passes them to the handler', async () => {
    const handler = await setupApi([
      {
        path: '/api/users/:id',
        lazy: async () => ({
          GET: (ctx) => Response.json({ id: ctx.params.id }),
        }),
      },
    ]);
    const res = makeRes();
    await handler(makeReq('/api/users/42'), res as never);
    await waitFinish(res);
    expect(JSON.parse(res.body)).toEqual({ id: '42' });
  });

  it('returns 500 when an API handler throws', async () => {
    const handler = await setupApi([
      {
        path: '/api/boom',
        lazy: async () => ({
          GET: () => {
            throw new Error('boom');
          },
        }),
      },
    ]);
    const res = makeRes();
    await handler(makeReq('/api/boom'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toBe('Internal Server Error');
  });
});

describe('createRequestHandler — static files', () => {
  it('serves a file from clientDir with a matching MIME type', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<!--ssr-outlet-->',
      'assets/app.js': 'console.log("hi")',
    });
    const handler = createRequestHandler({
      clientDir,
      serverEntry: { render: () => ({ html: '' }) },
    });
    const res = makeRes();
    await handler(makeReq('/assets/app.js'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(200);
    expect(res._headers['content-type']).toBe('text/javascript; charset=utf-8');
    expect(res.body).toBe('console.log("hi")');
  });

  it('applies immutable cache headers for content-hashed filenames', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<!--ssr-outlet-->',
      'assets/app-abc12345.js': 'x',
    });
    const handler = createRequestHandler({
      clientDir,
      serverEntry: { render: () => ({ html: '' }) },
    });
    const res = makeRes();
    await handler(makeReq('/assets/app-abc12345.js'), res as never);
    await waitFinish(res);
    expect(res._headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('does not apply immutable cache headers for unhashed filenames', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<!--ssr-outlet-->',
      'favicon.ico': 'x',
    });
    const handler = createRequestHandler({
      clientDir,
      serverEntry: { render: () => ({ html: '' }) },
    });
    const res = makeRes();
    await handler(makeReq('/favicon.ico'), res as never);
    await waitFinish(res);
    expect(res._headers['cache-control']).toBeUndefined();
  });

  it('falls through to SSR when an asset-looking path has no file on disk', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<!--ssr-outlet-->',
    });
    const rendered: string[] = [];
    const handler = createRequestHandler({
      clientDir,
      serverEntry: {
        render: (ctx) => {
          rendered.push(ctx.url);
          return { html: 'page' };
        },
      },
    });
    const res = makeRes();
    await handler(makeReq('/users/foo.bar'), res as never);
    await waitFinish(res);
    expect(rendered).toEqual(['/users/foo.bar']);
    expect(res.statusCode).toBe(200);
  });

  it('rejects path traversal attempts with 403', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<!--ssr-outlet-->',
    });
    const handler = createRequestHandler({
      clientDir,
      serverEntry: { render: () => ({ html: '' }) },
    });
    const res = makeRes();
    await handler(makeReq('/../secret.js'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(403);
  });

  it('decodes percent-encoded paths before serving', async () => {
    const clientDir = await mkClientDir({
      'index.html': '<!--ssr-outlet-->',
      'assets/a b.js': 'spaced',
    });
    const handler = createRequestHandler({
      clientDir,
      serverEntry: { render: () => ({ html: '' }) },
    });
    const res = makeRes();
    await handler(makeReq('/assets/a%20b.js'), res as never);
    await waitFinish(res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('spaced');
  });
});
