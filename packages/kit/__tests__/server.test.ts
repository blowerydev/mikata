import { describe, it, expect } from 'vitest';
import { _template, _insert, _createComponent, ErrorBoundary } from '@mikata/runtime';
import { routeOutlet } from '@mikata/router';
import { renderRoute } from '../src/server';
import { useLoaderData, LOADER_DATA_GLOBAL } from '../src/loader';
import {
  ACTION_DATA_GLOBAL,
  redirect,
  useActionData,
  type ActionContext,
} from '../src/action';

// Construct components the way the compiler would emit them — no JSX
// here, so these tests exercise the full @mikata/kit/server → renderToString
// pipeline without pulling in the Babel plugin.

function staticNode(html: string, slot: unknown) {
  return () => {
    const root = _template(html).cloneNode(true) as any;
    const marker = root.childNodes[1];
    _insert(root, typeof slot === 'function' ? slot : () => slot, marker);
    return root;
  };
}

describe('renderRoute', () => {
  it('renders the matching route to HTML', async () => {
    const Home = staticNode('<h1>Home <!>!</h1>', 'page');
    const About = staticNode('<h1>About <!>!</h1>', 'page');
    const routes = [
      { path: '/', component: () => _createComponent(Home, {}) },
      { path: '/about', component: () => _createComponent(About, {}) },
    ];
    const { html: homeHtml } = await renderRoute(routes, { url: '/' });
    expect(homeHtml).toContain('Home page');
    expect(homeHtml).not.toContain('About');

    const { html: aboutHtml } = await renderRoute(routes, { url: '/about' });
    expect(aboutHtml).toContain('About page');
    expect(aboutHtml).not.toContain('Home');
  });

  it('awaits lazy() routes on the match chain before rendering', async () => {
    let importCount = 0;
    const Lazy = staticNode('<p>lazy <!>!</p>', 'loaded');
    const routes = [
      {
        path: '/lazy',
        lazy: async () => {
          importCount++;
          return { default: () => _createComponent(Lazy, {}) };
        },
      },
    ];
    const { html } = await renderRoute(routes, { url: '/lazy' });
    expect(importCount).toBe(1);
    expect(html).toContain('lazy loaded');
  });

  it('does not eagerly import non-matching lazy routes', async () => {
    let importCount = 0;
    const Home = staticNode('<h1>home <!>!</h1>', '');
    const routes = [
      { path: '/', component: () => _createComponent(Home, {}) },
      {
        path: '/heavy',
        lazy: async () => {
          importCount++;
          return { default: Home };
        },
      },
    ];
    await renderRoute(routes, { url: '/' });
    // `/heavy` was never a prefix of `/`, so its lazy() must stay un-invoked.
    expect(importCount).toBe(0);
  });

  it('resolves nested lazy routes under a matched parent', async () => {
    let childLoaded = false;
    // Parent renders a nested <routeOutlet/> in its marker slot so the
    // matched child route has somewhere to mount.
    const Parent = staticNode('<section>parent <!></section>', () => routeOutlet());
    const Child = staticNode('<span>child <!>!</span>', 'hi');
    const routes = [
      {
        path: '/app',
        component: () => _createComponent(Parent, {}),
        children: [
          {
            path: '/detail',
            lazy: async () => {
              childLoaded = true;
              return { default: () => _createComponent(Child, {}) };
            },
          },
        ],
      },
    ];
    const { html } = await renderRoute(routes, { url: '/app/detail' });
    expect(childLoaded).toBe(true);
    expect(html).toContain('child hi');
  });

  it('strips query string and fragment from match URL', async () => {
    const About = staticNode('<p>about <!>!</p>', 'ok');
    const routes = [
      { path: '/about', component: () => _createComponent(About, {}) },
    ];
    const { html } = await renderRoute(routes, { url: '/about?foo=1#bar' });
    expect(html).toContain('about ok');
  });

  it('returns status 200 for a matched route', async () => {
    const Home = staticNode('<h1>Home <!>!</h1>', 'page');
    const routes = [{ path: '/', component: () => _createComponent(Home, {}) }];
    const { status } = await renderRoute(routes, { url: '/' });
    expect(status).toBe(200);
  });

  it('returns status 404 when no route matches', async () => {
    const Home = staticNode('<h1>Home <!>!</h1>', 'page');
    const routes = [{ path: '/', component: () => _createComponent(Home, {}) }];
    const { status } = await renderRoute(routes, { url: '/does-not-exist' });
    expect(status).toBe(404);
  });

  describe('base path stripping', () => {
    // Browser history strips the configured `base` from `pathname`
    // before matching. Memory history (used here) takes the URL
    // verbatim, so the kit has to strip it first. Without that, an
    // app mounted under `/docs` 404s every SSR / prerender hit.
    const Home = staticNode('<h1>Home <!>!</h1>', 'page');
    const About = staticNode('<h1>About <!>!</h1>', 'page');
    const routes = [
      { path: '/', component: () => _createComponent(Home, {}) },
      { path: '/about', component: () => _createComponent(About, {}) },
    ];

    it('matches /docs/about against route /about when base=/docs', async () => {
      const { html, status } = await renderRoute(routes, { url: '/docs/about', base: '/docs' });
      expect(status).toBe(200);
      expect(html).toContain('About page');
    });

    it('treats the bare base path as the route root', async () => {
      const { html, status } = await renderRoute(routes, { url: '/docs', base: '/docs' });
      expect(status).toBe(200);
      expect(html).toContain('Home page');
    });

    it('preserves the search/hash when stripping the base off a base-only URL', async () => {
      const { html, status } = await renderRoute(routes, { url: '/docs?q=1', base: '/docs' });
      expect(status).toBe(200);
      expect(html).toContain('Home page');
    });

    it('does not strip an incidental base prefix (/docsfoo vs base=/docs)', async () => {
      // `/docsfoo` is a different route, not a base + `/foo`. Without a
      // boundary check the matcher would adopt `/foo` here.
      const { status } = await renderRoute(routes, { url: '/docsfoo', base: '/docs' });
      expect(status).toBe(404);
    });

    it('still 404s for unmatched paths under the base', async () => {
      const { status } = await renderRoute(routes, { url: '/docs/missing', base: '/docs' });
      expect(status).toBe(404);
    });

    it('is a no-op when base is empty', async () => {
      const { html, status } = await renderRoute(routes, { url: '/about' });
      expect(status).toBe(200);
      expect(html).toContain('About page');
    });
  });

  describe('loaders', () => {
    it('invokes load() and provides data to the matched component', async () => {
      let loadCount = 0;
      const Page = () => {
        const data = useLoaderData<() => Promise<{ name: string }>>();
        const root = _template('<p>hello <!>!</p>').cloneNode(true) as any;
        _insert(root, () => data()?.name ?? '', root.childNodes[1]);
        return root;
      };
      const routes = [
        {
          path: '/users/:id',
          lazy: async () => ({
            default: () => _createComponent(Page, {}),
            load: async (ctx: { params: Record<string, string> }) => {
              loadCount++;
              return { name: `user-${ctx.params.id}` };
            },
          }),
        },
      ];
      const { html, stateScript } = await renderRoute(routes, {
        url: '/users/42',
      });
      expect(loadCount).toBe(1);
      expect(html).toContain('hello user-42');
      expect(stateScript).toContain(LOADER_DATA_GLOBAL);
      expect(stateScript).toContain('"name":"user-42"');
    });

    it('skips loader serialization when no route defines one', async () => {
      const Home = () => _template('<h1>plain</h1>').cloneNode(true) as any;
      const routes = [
        { path: '/', lazy: async () => ({ default: Home }) },
      ];
      const { stateScript } = await renderRoute(routes, { url: '/' });
      expect(stateScript).not.toContain(LOADER_DATA_GLOBAL);
    });

    it('does not invoke load() on non-matching routes', async () => {
      let bMatchedLoad = 0;
      const A = () => _template('<p>a</p>').cloneNode(true) as any;
      const B = () => _template('<p>b</p>').cloneNode(true) as any;
      const routes = [
        { path: '/a', lazy: async () => ({ default: A, load: async () => 'a-data' }) },
        {
          path: '/b',
          lazy: async () => ({
            default: B,
            load: async () => {
              bMatchedLoad++;
              return 'b-data';
            },
          }),
        },
      ];
      await renderRoute(routes, { url: '/a' });
      expect(bMatchedLoad).toBe(0);
    });

    it('passes params and url into the load context', async () => {
      let captured: unknown = null;
      const Page = () => _template('<div>x</div>').cloneNode(true) as any;
      const routes = [
        {
          path: '/posts/:id',
          lazy: async () => ({
            default: Page,
            load: async (ctx: unknown) => {
              captured = ctx;
              return { ok: true };
            },
          }),
        },
      ];
      await renderRoute(routes, { url: '/posts/abc?q=1' });
      expect(captured).toMatchObject({
        params: { id: 'abc' },
        url: '/posts/abc?q=1',
      });
      // The cookies handle is always provided — even without a Cookie
      // header — so load() can queue Set-Cookies unconditionally.
      expect((captured as { cookies: unknown }).cookies).toBeDefined();
    });
  });

  describe('notFound', () => {
    it('renders the notFound module with status 404 when no route matches', async () => {
      const Home = staticNode('<h1>home <!>!</h1>', 'x');
      const NotFound = staticNode('<h1>not <!>!</h1>', 'found');
      const routes = [
        { path: '/', component: () => _createComponent(Home, {}) },
      ];
      const { html, status } = await renderRoute(routes, {
        url: '/nope',
        notFound: async () => ({
          default: () => _createComponent(NotFound, {}),
        }),
      });
      expect(status).toBe(404);
      expect(html).toContain('not found');
      expect(html).not.toContain('home');
    });

    it('still returns 404 even when notFound is omitted', async () => {
      const Home = staticNode('<h1>home <!>!</h1>', 'x');
      const routes = [
        { path: '/', component: () => _createComponent(Home, {}) },
      ];
      const { status } = await renderRoute(routes, { url: '/nope' });
      expect(status).toBe(404);
    });
  });

  describe('loader errors', () => {
    it('routes a thrown load() through useLoaderData into a parent ErrorBoundary', async () => {
      const Boom = () => {
        const data = useLoaderData();
        const root = _template('<p>data <!></p>').cloneNode(true) as any;
        _insert(root, () => String((data as any)()), root.childNodes[1]);
        return root;
      };
      const Fallback = (err: Error) => {
        const root = _template('<div class="err"><!></div>').cloneNode(true) as any;
        _insert(root, () => err.message, root.childNodes[0]);
        return root;
      };
      const routes = [
        {
          path: '/boom',
          lazy: async () => ({
            default: () =>
              _createComponent(ErrorBoundary, {
                fallback: Fallback,
                get children() {
                  return _createComponent(Boom, {});
                },
              }),
            load: async () => {
              throw new Error('kaboom');
            },
          }),
        },
      ];
      const { html, status, stateScript } = await renderRoute(routes, {
        url: '/boom',
      });
      expect(status).toBe(500);
      expect(html).toContain('kaboom');
      expect(html).not.toContain('data undefined');
      expect(stateScript).toContain('"message":"kaboom"');
      expect(stateScript).toContain('"name":"Error"');
    });

    it('keeps status 200 for matched routes whose loaders all succeed', async () => {
      const Page = () => _template('<p>ok</p>').cloneNode(true) as any;
      const routes = [
        {
          path: '/ok',
          lazy: async () => ({
            default: Page,
            load: async () => ({ ok: true }),
          }),
        },
      ];
      const { status } = await renderRoute(routes, { url: '/ok' });
      expect(status).toBe(200);
    });
  });

  describe('actions', () => {
    // Fixed token used for every POST in this block. `postRequest` sets
    // `X-Mikata-CSRF` and `CSRF_COOKIE_HEADER` pairs them with the
    // inbound cookie so kit's double-submit check passes.
    const CSRF_TOKEN = 'a'.repeat(32);
    const CSRF_COOKIE_HEADER = `mikata_csrf=${CSRF_TOKEN}`;

    // Build a mutation Request the same way a real adapter would — fetch's
    // Request is fine in jsdom and matches the shape server.ts expects.
    function postRequest(url: string, body = 'name=ada'): Request {
      return new Request(`http://x${url}`, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'X-Mikata-CSRF': CSRF_TOKEN,
        },
      });
    }

    it('invokes action() for non-GET requests and serialises the result', async () => {
      let actionCalls = 0;
      const Page = staticNode('<p>p</p>', '');
      const routes = [
        {
          path: '/contact',
          lazy: async () => ({
            default: () => _createComponent(Page, {}),
            action: async ({ request }: ActionContext) => {
              actionCalls++;
              const form = await request.formData();
              return { ok: true, name: form.get('name') };
            },
          }),
        },
      ];
      const { actionData, stateScript, status } = await renderRoute(routes, {
        url: '/contact',
        request: postRequest('/contact'),
        cookieHeader: CSRF_COOKIE_HEADER,
      });
      expect(actionCalls).toBe(1);
      expect(actionData['/contact']).toEqual({
        data: { ok: true, name: 'ada' },
      });
      expect(status).toBe(200);
      expect(stateScript).toContain(ACTION_DATA_GLOBAL);
      expect(stateScript).toContain('"ok":true');
    });

    it('does not invoke action() on GET requests', async () => {
      let actionCalls = 0;
      const Page = staticNode('<p>p</p>', '');
      const routes = [
        {
          path: '/c',
          lazy: async () => ({
            default: () => _createComponent(Page, {}),
            action: async () => {
              actionCalls++;
              return { ok: true };
            },
          }),
        },
      ];
      // GET-with-request should still take the read path — the action
      // must stay dormant.
      const getReq = new Request('http://x/c', { method: 'GET' });
      const { actionData, stateScript } = await renderRoute(routes, {
        url: '/c',
        request: getReq,
      });
      expect(actionCalls).toBe(0);
      expect(actionData).toEqual({});
      expect(stateScript).not.toContain(ACTION_DATA_GLOBAL);
    });

    it('does not invoke action() when request is omitted entirely', async () => {
      let actionCalls = 0;
      const Page = staticNode('<p>p</p>', '');
      const routes = [
        {
          path: '/c',
          lazy: async () => ({
            default: () => _createComponent(Page, {}),
            action: async () => {
              actionCalls++;
              return { ok: true };
            },
          }),
        },
      ];
      await renderRoute(routes, { url: '/c' });
      expect(actionCalls).toBe(0);
    });

    it('short-circuits rendering when action returns a redirect Response', async () => {
      let loaderCalls = 0;
      const Page = staticNode('<p>p</p>', '');
      const routes = [
        {
          path: '/c',
          lazy: async () => ({
            default: () => _createComponent(Page, {}),
            load: async () => {
              loaderCalls++;
              return { x: 1 };
            },
            action: async () => redirect('/thanks', 303),
          }),
        },
      ];
      const result = await renderRoute(routes, {
        url: '/c',
        request: postRequest('/c'),
        cookieHeader: CSRF_COOKIE_HEADER,
      });
      expect(result.redirect).toEqual({ url: '/thanks', status: 303 });
      expect(result.status).toBe(303);
      // HTML + loader work is skipped — the client follows the Location
      // header and reloads against the new URL. No wasted render.
      expect(result.html).toBe('');
      expect(result.stateScript).toBe('');
      expect(result.loaderData).toEqual({});
      expect(loaderCalls).toBe(0);
    });

    it('records a thrown action as an error and bumps status to 500', async () => {
      const Page = staticNode('<p>p</p>', '');
      const routes = [
        {
          path: '/c',
          lazy: async () => ({
            default: () => _createComponent(Page, {}),
            action: async () => {
              throw new Error('bad form');
            },
          }),
        },
      ];
      const { actionData, status, stateScript } = await renderRoute(routes, {
        url: '/c',
        request: postRequest('/c'),
        cookieHeader: CSRF_COOKIE_HEADER,
      });
      expect(status).toBe(500);
      expect(actionData['/c']).toEqual({
        error: { message: 'bad form', name: 'Error' },
      });
      expect(stateScript).toContain('"message":"bad form"');
    });

    it('surfaces action data to useActionData() in the rendered tree', async () => {
      const Page = () => {
        const result = useActionData<() => Promise<{ ok: boolean }>>();
        const root = _template('<p>status <!></p>').cloneNode(true) as any;
        _insert(
          root,
          () => (result() ? (result()!.ok ? 'saved' : 'failed') : 'idle'),
          root.childNodes[1],
        );
        return root;
      };
      const routes = [
        {
          path: '/c',
          lazy: async () => ({
            default: () => _createComponent(Page, {}),
            action: async () => ({ ok: true }),
          }),
        },
      ];
      const { html } = await renderRoute(routes, {
        url: '/c',
        request: postRequest('/c'),
        cookieHeader: CSRF_COOKIE_HEADER,
      });
      expect(html).toContain('status saved');
    });

    it('rethrows action errors through ErrorBoundary in the rendered tree', async () => {
      const Boom = () => {
        const result = useActionData();
        const root = _template('<p>x <!></p>').cloneNode(true) as any;
        _insert(root, () => String((result as any)()), root.childNodes[1]);
        return root;
      };
      const Fallback = (err: Error) => {
        const root = _template('<div class="err"><!></div>').cloneNode(true) as any;
        _insert(root, () => err.message, root.childNodes[0]);
        return root;
      };
      const routes = [
        {
          path: '/c',
          lazy: async () => ({
            default: () =>
              _createComponent(ErrorBoundary, {
                fallback: Fallback,
                get children() {
                  return _createComponent(Boom, {});
                },
              }),
            action: async () => {
              throw new Error('rip');
            },
          }),
        },
      ];
      const { html, status } = await renderRoute(routes, {
        url: '/c',
        request: postRequest('/c'),
        cookieHeader: CSRF_COOKIE_HEADER,
      });
      expect(status).toBe(500);
      expect(html).toContain('rip');
      expect(html).not.toContain('x undefined');
    });

    it('runs loaders after the action so they see post-mutation state', async () => {
      const order: string[] = [];
      const Page = staticNode('<p>p</p>', '');
      const routes = [
        {
          path: '/c',
          lazy: async () => ({
            default: () => _createComponent(Page, {}),
            action: async () => {
              order.push('action');
              return { ok: true };
            },
            load: async () => {
              order.push('load');
              return { count: 1 };
            },
          }),
        },
      ];
      await renderRoute(routes, {
        url: '/c',
        request: postRequest('/c'),
        cookieHeader: CSRF_COOKIE_HEADER,
      });
      expect(order).toEqual(['action', 'load']);
    });

    it('only runs the leaf action, not parent actions', async () => {
      let parentActions = 0;
      let childActions = 0;
      const Parent = staticNode('<section>p <!></section>', () => routeOutlet());
      const Child = staticNode('<span>c</span>', '');
      const routes = [
        {
          path: '/app',
          component: () => _createComponent(Parent, {}),
          lazy: async () => ({
            default: () => _createComponent(Parent, {}),
            action: async () => {
              parentActions++;
              return { parent: true };
            },
          }),
          children: [
            {
              path: '/edit',
              lazy: async () => ({
                default: () => _createComponent(Child, {}),
                action: async () => {
                  childActions++;
                  return { child: true };
                },
              }),
            },
          ],
        },
      ];
      const { actionData } = await renderRoute(routes, {
        url: '/app/edit',
        request: postRequest('/app/edit'),
        cookieHeader: CSRF_COOKIE_HEADER,
      });
      expect(childActions).toBe(1);
      expect(parentActions).toBe(0);
      expect(actionData['/app/edit']).toEqual({ data: { child: true } });
      expect(actionData['/app']).toBeUndefined();
    });

    describe('CSRF protection', () => {
      it('refuses the submit with 403 when no CSRF token is supplied', async () => {
        let actionCalls = 0;
        const Page = staticNode('<p>p</p>', '');
        const routes = [
          {
            path: '/c',
            lazy: async () => ({
              default: () => _createComponent(Page, {}),
              action: async () => {
                actionCalls++;
                return { ok: true };
              },
            }),
          },
        ];
        // POST without any CSRF token or cookie — the action must never fire.
        const naked = new Request('http://x/c', {
          method: 'POST',
          body: 'name=ada',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        });
        const { status, actionData } = await renderRoute(routes, {
          url: '/c',
          request: naked,
        });
        expect(status).toBe(403);
        expect(actionCalls).toBe(0);
        expect(actionData).toEqual({});
      });

      it('refuses the submit with 403 when tokens do not match', async () => {
        let actionCalls = 0;
        const Page = staticNode('<p>p</p>', '');
        const routes = [
          {
            path: '/c',
            lazy: async () => ({
              default: () => _createComponent(Page, {}),
              action: async () => {
                actionCalls++;
                return { ok: true };
              },
            }),
          },
        ];
        const cookieToken = 'a'.repeat(32);
        const submittedToken = 'b'.repeat(32);
        const req = new Request('http://x/c', {
          method: 'POST',
          body: 'name=ada',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'X-Mikata-CSRF': submittedToken,
          },
        });
        const { status } = await renderRoute(routes, {
          url: '/c',
          request: req,
          cookieHeader: `mikata_csrf=${cookieToken}`,
        });
        expect(status).toBe(403);
        expect(actionCalls).toBe(0);
      });

      it('still issues a Set-Cookie on 403 so the client can retry', async () => {
        const Page = staticNode('<p>p</p>', '');
        const routes = [
          {
            path: '/c',
            lazy: async () => ({
              default: () => _createComponent(Page, {}),
              action: async () => ({ ok: true }),
            }),
          },
        ];
        // No inbound cookie at all — server should mint a token and echo it
        // even though the action is refused.
        const req = new Request('http://x/c', {
          method: 'POST',
          body: 'name=ada',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        });
        const { status, setCookies } = await renderRoute(routes, {
          url: '/c',
          request: req,
        });
        expect(status).toBe(403);
        expect(setCookies.some((c) => c.startsWith('mikata_csrf='))).toBe(true);
      });

      it('embeds the CSRF token in the state script on normal renders', async () => {
        const Page = staticNode('<p>p</p>', '');
        const routes = [
          { path: '/', component: () => _createComponent(Page, {}) },
        ];
        const { stateScript } = await renderRoute(routes, { url: '/' });
        expect(stateScript).toContain('__MIKATA_CSRF__');
      });
    });
  });

  it('renders a layout with sibling markup around the outlet', async () => {
    // Two comment markers in the template: one before the outlet, one after.
    // Mirrors the JSX `<div><h1>Layout</h1>{routeOutlet()}<footer>end</footer></div>`
    // that a real _layout.tsx would compile to.
    const Layout = () => {
      const root = _template('<div><h1>Layout</h1><!><footer>end</footer></div>').cloneNode(
        true,
      ) as any;
      const marker = root.childNodes[1]; // the <!> placeholder
      _insert(root, () => routeOutlet(), marker);
      return root;
    };
    const Child = staticNode('<span>child <!>!</span>', 'hi');
    const routes = [
      {
        path: '/',
        component: () => _createComponent(Layout, {}),
        children: [
          { path: '/page', component: () => _createComponent(Child, {}) },
        ],
      },
    ];
    const { html } = await renderRoute(routes, { url: '/page' });
    expect(html).toContain('child hi');
    expect(html).not.toContain('[object Object]');
  });

  it('accepts the manifest-namespace form and pulls notFound off it', async () => {
    const Home = staticNode('<h1>home <!>!</h1>', 'ok');
    const NotFound = staticNode('<p>missing <!>!</p>', 'page');
    const manifest = {
      routes: [{ path: '/', component: () => _createComponent(Home, {}) }],
      notFound: async () => ({
        default: () =>
          _createComponent(NotFound, {}) as unknown as Node | null,
      }),
      base: '/app',
    };

    const { html: hit } = await renderRoute(manifest, { url: '/' });
    expect(hit).toContain('home ok');

    const { html: miss, status } = await renderRoute(manifest, {
      url: '/nope',
    });
    expect(miss).toContain('missing page');
    expect(status).toBe(404);
  });

  it('options.notFound overrides manifest-supplied notFound', async () => {
    const Home = staticNode('<h1>home <!>!</h1>', 'ok');
    const FromManifest = staticNode('<p>manifest <!>!</p>', '404');
    const FromOptions = staticNode('<p>options <!>!</p>', '404');
    const manifest = {
      routes: [{ path: '/', component: () => _createComponent(Home, {}) }],
      notFound: async () => ({
        default: () =>
          _createComponent(FromManifest, {}) as unknown as Node | null,
      }),
    };
    const { html } = await renderRoute(manifest, {
      url: '/nope',
      notFound: async () => ({
        default: () =>
          _createComponent(FromOptions, {}) as unknown as Node | null,
      }),
    });
    expect(html).toContain('options 404');
    expect(html).not.toContain('manifest 404');
  });
});
