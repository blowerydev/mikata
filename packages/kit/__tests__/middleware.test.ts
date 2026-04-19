import { describe, it, expect, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { createSsrMiddleware } from '../src/middleware';

interface FakeServer {
  transformIndexHtml: ReturnType<typeof vi.fn>;
  ssrLoadModule: ReturnType<typeof vi.fn>;
  ssrFixStacktrace: (err: Error) => void;
}

function makeServer(overrides: Partial<FakeServer> = {}): FakeServer {
  return {
    transformIndexHtml: vi.fn(async (_url: string, html: string) =>
      html.replace('</head>', '<script src="/@vite/client"></script></head>'),
    ),
    ssrLoadModule: vi.fn(),
    ssrFixStacktrace: () => {},
    ...overrides,
  };
}

function makeReq(url: string, headers: Record<string, string> = {}) {
  // Use an empty Readable so `for await` over the body works in the
  // middleware path that builds a Fetch Request (API dispatch needs
  // this for GETs too). Assigning url/method/headers lets the middleware
  // read them the same way it would on a real IncomingMessage.
  const stream = Readable.from([]);
  Object.assign(stream, {
    url,
    method: 'GET',
    headers: { accept: 'text/html', ...headers },
  });
  return stream as any;
}

function makeBodyReq(
  url: string,
  method: string,
  body: string,
  headers: Record<string, string> = {},
) {
  const stream = Readable.from([Buffer.from(body)]);
  Object.assign(stream, {
    url,
    method,
    headers: { accept: 'text/html', ...headers },
  });
  return stream as any;
}

function makeRes() {
  const chunks: string[] = [];
  return {
    statusCode: 0,
    _headers: {} as Record<string, string>,
    setHeader(key: string, value: string) {
      this._headers[key] = value;
    },
    end(chunk: string) {
      chunks.push(chunk);
    },
    get body() {
      return chunks.join('');
    },
  } as any;
}

const tempRoots: string[] = [];
afterEach(async () => {
  while (tempRoots.length) {
    await fs.rm(tempRoots.pop()!, { recursive: true, force: true });
  }
});

async function mkProject(files: Record<string, string>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mikata-mw-test-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(root, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }
  tempRoots.push(root);
  return root;
}

describe('createSsrMiddleware', () => {
  it('renders index.html with the SSR html + state script spliced in', async () => {
    const root = await mkProject({
      'index.html': '<html><head></head><body><div id="root"><!--ssr-outlet--></div></body></html>',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const server = makeServer({
      ssrLoadModule: vi.fn(async () => ({
        render: () => ({
          html: '<h1>hello</h1>',
          stateScript: '<script>window.__MIKATA_STATE__={"k":1}</script>',
        }),
      })),
    });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const req = makeReq('/');
    const res = makeRes();
    const next = vi.fn();

    await mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res._headers['Content-Type']).toBe('text/html');
    expect(res.body).toContain('<h1>hello</h1>');
    expect(res.body).toContain('window.__MIKATA_STATE__');
    expect(res.body).toContain('/@vite/client'); // transformIndexHtml ran
  });

  it('passes the request URL through to render()', async () => {
    const root = await mkProject({
      'index.html': '<html><body><!--ssr-outlet--></body></html>',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const render = vi.fn(() => ({ html: '' }));
    const server = makeServer({ ssrLoadModule: vi.fn(async () => ({ render })) });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });

    await mw(makeReq('/about?x=1'), makeRes(), vi.fn());

    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/about?x=1' }),
    );
  });

  it('skips static asset URLs', async () => {
    const root = await mkProject({
      'index.html': '<!--ssr-outlet-->',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const server = makeServer();
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const next = vi.fn();

    await mw(makeReq('/main.css'), makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(server.ssrLoadModule).not.toHaveBeenCalled();
  });

  it('skips HEAD requests', async () => {
    const root = await mkProject({
      'index.html': '<!--ssr-outlet-->',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const server = makeServer();
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const next = vi.fn();

    const req = makeReq('/');
    req.method = 'HEAD';
    await mw(req, makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(server.ssrLoadModule).not.toHaveBeenCalled();
  });

  it('hands POST requests to render() with a built Request object', async () => {
    const root = await mkProject({
      'index.html': '<html><body><!--ssr-outlet--></body></html>',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    let seenRequest: Request | undefined;
    const render = vi.fn(async (ctx: any) => {
      seenRequest = ctx.request;
      const form = await ctx.request.formData();
      return { html: `<p>saw ${form.get('name')}</p>` };
    });
    const server = makeServer({ ssrLoadModule: vi.fn(async () => ({ render })) });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const res = makeRes();

    await mw(
      makeBodyReq('/contact', 'POST', 'name=Ada', {
        'content-type': 'application/x-www-form-urlencoded',
      }),
      res,
      vi.fn(),
    );

    expect(seenRequest).toBeInstanceOf(Request);
    expect(res.body).toContain('<p>saw Ada</p>');
  });

  it('forwards action redirects as HTTP redirects', async () => {
    const root = await mkProject({
      'index.html': '<!--ssr-outlet-->',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const render = vi.fn(() => ({
      html: '',
      redirect: { url: '/thanks', status: 303 },
    }));
    const server = makeServer({ ssrLoadModule: vi.fn(async () => ({ render })) });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const res = makeRes();

    await mw(
      makeBodyReq('/contact', 'POST', '', {
        'content-type': 'application/x-www-form-urlencoded',
      }),
      res,
      vi.fn(),
    );

    expect(res.statusCode).toBe(303);
    expect(res._headers['Location']).toBe('/thanks');
  });

  it('returns JSON for enhanced submits marked with X-Mikata-Form', async () => {
    const root = await mkProject({
      'index.html': '<!--ssr-outlet-->',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const render = vi.fn(() => ({
      html: 'unused',
      actionData: { '/c': { data: { ok: true } } },
      loaderData: { '/c': { data: 1 } },
    }));
    const server = makeServer({ ssrLoadModule: vi.fn(async () => ({ render })) });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const res = makeRes();

    await mw(
      makeBodyReq('/c', 'POST', '', {
        'content-type': 'application/x-www-form-urlencoded',
        'x-mikata-form': '1',
        accept: 'application/json',
      }),
      res,
      vi.fn(),
    );

    expect(res._headers['Content-Type']).toBe('application/json; charset=utf-8');
    const payload = JSON.parse(res.body);
    expect(payload.actionData['/c'].data.ok).toBe(true);
    expect(payload.loaderData['/c'].data).toBe(1);
  });

  it('forwards a helpful error when the server entry is missing', async () => {
    const root = await mkProject({
      'index.html': '<!--ssr-outlet-->',
    });
    const server = makeServer();
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const next = vi.fn();

    await mw(makeReq('/'), makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as Error;
    expect(err.message).toContain('server entry not found');
  });

  it('errors if the loaded entry has no render export', async () => {
    const root = await mkProject({
      'index.html': '<!--ssr-outlet-->',
      'src/entry-server.ts': 'export const other = 1;',
    });
    const server = makeServer({
      ssrLoadModule: vi.fn(async () => ({ other: 1 })),
    });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const next = vi.fn();

    await mw(makeReq('/'), makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as Error;
    expect(err.message).toContain('must export a named `render');
  });

  it('passes render()-returned status through to res.statusCode', async () => {
    const root = await mkProject({
      'index.html': '<!--ssr-outlet-->',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const server = makeServer({
      ssrLoadModule: vi.fn(async () => ({
        render: () => ({ html: 'missing', status: 404 }),
      })),
    });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const res = makeRes();

    await mw(makeReq('/nope'), res, vi.fn());

    expect(res.statusCode).toBe(404);
  });

  it('dispatches API routes before rendering a page', async () => {
    const root = await mkProject({
      'index.html': '<html><body><!--ssr-outlet--></body></html>',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const render = vi.fn(() => ({ html: '<p>page</p>' }));
    const server = makeServer({
      ssrLoadModule: vi.fn(async () => ({
        render,
        apiRoutes: [
          {
            path: '/api/ping',
            lazy: async () => ({
              GET: () => Response.json({ pong: true }),
            }),
          },
        ],
      })),
    });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const res = makeRes();

    await mw(
      makeReq('/api/ping', { accept: 'application/json' }),
      res,
      vi.fn(),
    );

    expect(render).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res._headers['content-type']).toContain('application/json');
    expect(JSON.parse(res.body)).toEqual({ pong: true });
  });

  it('falls through to SSR when no API route matches the URL', async () => {
    const root = await mkProject({
      'index.html': '<html><body><!--ssr-outlet--></body></html>',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const render = vi.fn(() => ({ html: '<p>page</p>' }));
    const server = makeServer({
      ssrLoadModule: vi.fn(async () => ({
        render,
        apiRoutes: [
          {
            path: '/api/other',
            lazy: async () => ({ GET: () => new Response('other') }),
          },
        ],
      })),
    });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const res = makeRes();

    await mw(makeReq('/about'), res, vi.fn());

    expect(render).toHaveBeenCalledTimes(1);
    expect(res.body).toContain('<p>page</p>');
  });

  it('returns 405 for API routes with a mismatched verb', async () => {
    const root = await mkProject({
      'index.html': '<html><body><!--ssr-outlet--></body></html>',
      'src/entry-server.ts': 'export const render = () => ({});',
    });
    const server = makeServer({
      ssrLoadModule: vi.fn(async () => ({
        render: () => ({ html: '' }),
        apiRoutes: [
          {
            path: '/api/users',
            lazy: async () => ({ GET: () => Response.json([]) }),
          },
        ],
      })),
    });
    const mw = createSsrMiddleware(server as any, { projectRoot: root });
    const res = makeRes();

    await mw(
      makeBodyReq('/api/users', 'POST', '', {
        'content-type': 'application/x-www-form-urlencoded',
      }),
      res,
      vi.fn(),
    );

    expect(res.statusCode).toBe(405);
    expect(res._headers['allow']).toBe('GET');
  });

  it('honours a custom entry path and outlet marker', async () => {
    const root = await mkProject({
      'index.html': '<html><body>{{APP}}</body></html>',
      'app/ssr.tsx': 'export const render = () => ({});',
    });
    const server = makeServer({
      ssrLoadModule: vi.fn(async () => ({ render: () => ({ html: 'HI' }) })),
    });
    const mw = createSsrMiddleware(server as any, {
      projectRoot: root,
      entry: 'app/ssr',
      outletMarker: '{{APP}}',
    });
    const res = makeRes();

    await mw(makeReq('/'), res, vi.fn());

    expect(res.body).toContain('HI');
    expect(res.body).not.toContain('{{APP}}');
  });
});
