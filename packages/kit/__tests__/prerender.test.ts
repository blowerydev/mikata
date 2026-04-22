import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { RouteDefinition } from '@mikata/router';
import {
  prerender,
  type PrerenderableRouteModule,
} from '../src/prerender';
import type { EdgeServerEntry, EdgeRenderResult } from '../src/adapter-edge';

const TEMPLATE =
  '<!doctype html><html><head><!--mikata-head--></head><body><div id="root"><!--ssr-outlet--></div></body></html>';

const tempDirs: string[] = [];
afterEach(async () => {
  while (tempDirs.length) {
    await fs.rm(tempDirs.pop()!, { recursive: true, force: true });
  }
});

async function mkTempDir(prefix = 'mikata-ssg-'): Promise<string> {
  const d = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(d);
  return d;
}

async function readFile(p: string): Promise<string> {
  return fs.readFile(p, 'utf8');
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a server entry whose render just stamps the requested URL into
 * the outlet so the tests can assert which URLs were rendered and that
 * the template splicing ran.
 */
function makeEntry(
  overrides?: (ctx: { url: string }) => Partial<EdgeRenderResult>,
): EdgeServerEntry {
  return {
    render: (ctx) => {
      const over = overrides?.(ctx) ?? {};
      return {
        html: `<p>at ${ctx.url}</p>`,
        status: 200,
        ...over,
      };
    },
  };
}

describe('prerender — static routes', () => {
  it('writes pretty-URL files for every static leaf', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      { path: '/', lazy: async () => ({ default: () => null }) },
      { path: '/about', lazy: async () => ({ default: () => null }) },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: makeEntry(),
    });
    expect(result.errors).toHaveLength(0);
    expect(result.pages.some((p) => p.url === '/')).toBe(true);
    expect(result.pages.some((p) => p.url === '/about')).toBe(true);

    const root = await readFile(path.join(outDir, 'index.html'));
    expect(root).toContain('<p>at /</p>');
    const about = await readFile(path.join(outDir, 'about/index.html'));
    expect(about).toContain('<p>at /about</p>');
  });

  it('flattens nested (layout) routes correctly', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      {
        // _layout.tsx emits `{ path: '/', children: [...] }`
        path: '/',
        lazy: async () => ({ default: () => null }),
        children: [
          { path: '/', lazy: async () => ({ default: () => null }) },
          { path: '/about', lazy: async () => ({ default: () => null }) },
        ],
      },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: makeEntry(),
    });
    const urls = result.pages.map((p) => p.url).sort();
    expect(urls).toContain('/');
    expect(urls).toContain('/about');
  });

  it('de-duplicates when auto-discovered URLs overlap user-supplied ones', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      { path: '/', lazy: async () => ({ default: () => null }) },
      { path: '/about', lazy: async () => ({ default: () => null }) },
    ];
    let renders = 0;
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      paths: ['/about'],
      serverEntry: {
        render: (ctx) => {
          renders++;
          return { html: `<p>${ctx.url}</p>` };
        },
      },
    });
    const aboutPages = result.pages.filter((p) => p.url === '/about');
    expect(aboutPages).toHaveLength(1);
    // Two unique URLs (`/`, `/about`) + the 404 sentinel = 3 renders.
    expect(renders).toBe(3);
  });
});

describe('prerender — parametric routes via getStaticPaths', () => {
  it('expands :params by calling the leafs getStaticPaths export', async () => {
    const outDir = await mkTempDir();
    const postsMod: PrerenderableRouteModule = {
      default: () => null,
      getStaticPaths: () => [{ id: '1' }, { id: '2' }, { id: '3' }],
    };
    const routes: RouteDefinition[] = [
      {
        path: '/posts/:id',
        lazy: async () => postsMod as { default: (p: unknown) => Node | null },
      },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: makeEntry(),
    });
    const urls = result.pages.map((p) => p.url).sort();
    expect(urls).toContain('/posts/1');
    expect(urls).toContain('/posts/2');
    expect(urls).toContain('/posts/3');
    expect(
      await exists(path.join(outDir, 'posts/1/index.html')),
    ).toBe(true);
    expect(
      await exists(path.join(outDir, 'posts/2/index.html')),
    ).toBe(true);
  });

  it('awaits an async getStaticPaths', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      {
        path: '/users/:slug',
        lazy: async () =>
          ({
            default: () => null,
            getStaticPaths: async () => {
              await Promise.resolve();
              return [{ slug: 'ada' }, { slug: 'grace' }];
            },
          }) as { default: (p: unknown) => Node | null },
      },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: makeEntry(),
    });
    expect(result.pages.map((p) => p.url)).toEqual(
      expect.arrayContaining(['/users/ada', '/users/grace']),
    );
  });

  it('url-encodes values returned from getStaticPaths', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      {
        path: '/posts/:slug',
        lazy: async () =>
          ({
            default: () => null,
            getStaticPaths: () => [{ slug: 'hello world' }],
          }) as { default: (p: unknown) => Node | null },
      },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: makeEntry(),
    });
    expect(result.pages.some((p) => p.url === '/posts/hello%20world')).toBe(
      true,
    );
    // Output file lands at the decoded path — pretty URLs for humans.
    expect(
      await exists(path.join(outDir, 'posts/hello world/index.html')),
    ).toBe(true);
  });

  it('records param routes with no getStaticPaths as skipped (fallback: skip)', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      { path: '/', lazy: async () => ({ default: () => null }) },
      {
        path: '/posts/:id',
        lazy: async () => ({ default: () => null }),
      },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: makeEntry(),
      fallback: 'skip',
    });
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]!.pattern).toBe('/posts/:id');
    expect(result.pages.some((p) => p.url === '/')).toBe(true);
    expect(result.pages.some((p) => p.url.startsWith('/posts/'))).toBe(false);
  });

  it('still renders a skipped param routes concrete paths if given via options.paths', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      {
        path: '/posts/:id',
        lazy: async () => ({ default: () => null }),
      },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      paths: ['/posts/42'],
      serverEntry: makeEntry(),
    });
    expect(result.pages.some((p) => p.url === '/posts/42')).toBe(true);
    // Pattern is covered by options.paths so the default fallback: 'error'
    // doesn't throw; the skipped record is still there for observability.
    expect(result.skipped).toHaveLength(1);
  });

  it('throws a helpful error when getStaticPaths omits a required param', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      {
        path: '/posts/:id',
        lazy: async () =>
          ({
            default: () => null,
            // `slug` is not a param of the pattern — `id` is missing.
            getStaticPaths: () => [{ slug: 'x' }],
          }) as { default: (p: unknown) => Node | null },
      },
    ];
    await expect(
      prerender({
        template: TEMPLATE,
        outDir,
        routes,
        serverEntry: makeEntry(),
      }),
    ).rejects.toThrow(/missing the "id" param/);
  });
});

describe('prerender — 404 page', () => {
  it('renders 404.html from whatever the entry returns for an unknown URL', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      { path: '/', lazy: async () => ({ default: () => null }) },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: {
        render: (ctx) => {
          if (ctx.url.includes('mikata_kit_404')) {
            return { html: '<h1>missing</h1>', status: 404 };
          }
          return { html: `<p>${ctx.url}</p>` };
        },
      },
    });
    expect(result.errors).toHaveLength(0);
    const notFound = await readFile(path.join(outDir, '404.html'));
    expect(notFound).toContain('<h1>missing</h1>');
  });

  it('can be disabled via notFoundHtml: false', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      { path: '/', lazy: async () => ({ default: () => null }) },
    ];
    await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: makeEntry(),
      notFoundHtml: false,
    });
    expect(await exists(path.join(outDir, '404.html'))).toBe(false);
  });
});

describe('prerender — asset copy', () => {
  it('copies the client directory into outDir', async () => {
    const clientDir = await mkTempDir('mikata-ssg-client-');
    const outDir = await mkTempDir();
    await fs.mkdir(path.join(clientDir, 'assets'), { recursive: true });
    await fs.writeFile(
      path.join(clientDir, 'assets/app.js'),
      'console.log(1)',
      'utf8',
    );
    await fs.writeFile(
      path.join(clientDir, 'assets/style.css'),
      'body{}',
      'utf8',
    );
    // A client-build index.html that should be *overwritten* by the
    // prerender's `/` page (so the deploy dir serves SSG HTML, not the
    // SPA shell).
    await fs.writeFile(
      path.join(clientDir, 'index.html'),
      '<html>SPA SHELL</html>',
      'utf8',
    );
    const routes: RouteDefinition[] = [
      { path: '/', lazy: async () => ({ default: () => null }) },
    ];
    await prerender({
      template: TEMPLATE,
      clientDir,
      outDir,
      routes,
      serverEntry: makeEntry(),
    });
    // Assets were copied verbatim.
    expect(await readFile(path.join(outDir, 'assets/app.js'))).toBe(
      'console.log(1)',
    );
    expect(await readFile(path.join(outDir, 'assets/style.css'))).toBe(
      'body{}',
    );
    // Root index.html was overwritten with the rendered page.
    const rootHtml = await readFile(path.join(outDir, 'index.html'));
    expect(rootHtml).toContain('<p>at /</p>');
    expect(rootHtml).not.toContain('SPA SHELL');
  });
});

describe('prerender — error handling', () => {
  it('collects per-URL errors and keeps rendering the rest', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      { path: '/', lazy: async () => ({ default: () => null }) },
      { path: '/bad', lazy: async () => ({ default: () => null }) },
      { path: '/after', lazy: async () => ({ default: () => null }) },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: {
        render: (ctx) => {
          if (ctx.url === '/bad') throw new Error('boom');
          return { html: `<p>${ctx.url}</p>` };
        },
      },
    });
    // `/bad` throws inside `render`; `createFetchHandler` swallows it
    // into a 500 Response — so the page is recorded but with status 500,
    // not as an error. Assert both ways so the test is accurate
    // regardless of which path kicks in.
    const bad = result.pages.find((p) => p.url === '/bad');
    if (bad) {
      expect(bad.status).toBe(500);
    } else {
      expect(result.errors.some((e) => e.url === '/bad')).toBe(true);
    }
    expect(result.pages.some((p) => p.url === '/')).toBe(true);
    expect(result.pages.some((p) => p.url === '/after')).toBe(true);
  });
});

describe('prerender — logging', () => {
  it('reports pages and skips through the log callback', async () => {
    const outDir = await mkTempDir();
    const messages: string[] = [];
    const routes: RouteDefinition[] = [
      { path: '/', lazy: async () => ({ default: () => null }) },
      {
        path: '/posts/:id',
        lazy: async () => ({ default: () => null }),
      },
    ];
    await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: makeEntry(),
      log: (m) => messages.push(m),
      fallback: 'skip',
    });
    expect(messages.some((m) => m.includes('/'))).toBe(true);
    expect(messages.some((m) => m.includes('skipped'))).toBe(true);
    expect(messages.some((m) => m.includes('/posts/:id'))).toBe(true);
  });
});

describe('prerender — fallback option', () => {
  it('throws by default when a parametric route is uncovered', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      { path: '/', lazy: async () => ({ default: () => null }) },
      {
        path: '/posts/:id',
        lazy: async () => ({ default: () => null }),
      },
    ];
    await expect(
      prerender({
        template: TEMPLATE,
        outDir,
        routes,
        serverEntry: makeEntry(),
      }),
    ).rejects.toThrow(/could not be enumerated/);
  });

  it('error message lists every uncovered pattern', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      {
        path: '/posts/:id',
        lazy: async () => ({ default: () => null }),
      },
      {
        path: '/users/:slug',
        lazy: async () => ({ default: () => null }),
      },
    ];
    let caught: Error | undefined;
    try {
      await prerender({
        template: TEMPLATE,
        outDir,
        routes,
        serverEntry: makeEntry(),
      });
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught!.message).toContain('/posts/:id');
    expect(caught!.message).toContain('/users/:slug');
  });

  it('does not throw when options.paths covers the pattern', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      {
        path: '/posts/:id',
        lazy: async () => ({ default: () => null }),
      },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      paths: ['/posts/42'],
      serverEntry: makeEntry(),
    });
    expect(result.pages.some((p) => p.url === '/posts/42')).toBe(true);
  });

  it('still throws when paths covers a different pattern than the uncovered one', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      {
        path: '/posts/:id',
        lazy: async () => ({ default: () => null }),
      },
      {
        path: '/users/:slug',
        lazy: async () => ({ default: () => null }),
      },
    ];
    await expect(
      prerender({
        template: TEMPLATE,
        outDir,
        routes,
        paths: ['/posts/42'],
        serverEntry: makeEntry(),
      }),
    ).rejects.toThrow(/\/users\/:slug/);
  });

  it('fallback: skip preserves the warn-and-continue behavior', async () => {
    const outDir = await mkTempDir();
    const routes: RouteDefinition[] = [
      {
        path: '/posts/:id',
        lazy: async () => ({ default: () => null }),
      },
    ];
    const result = await prerender({
      template: TEMPLATE,
      outDir,
      routes,
      serverEntry: makeEntry(),
      fallback: 'skip',
    });
    expect(result.skipped).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});
