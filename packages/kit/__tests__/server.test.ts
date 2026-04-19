import { describe, it, expect } from 'vitest';
import { _template, _insert, _createComponent, ErrorBoundary } from '@mikata/runtime';
import { routeOutlet } from '@mikata/router';
import { renderRoute } from '../src/server';
import { useLoaderData, LOADER_DATA_GLOBAL } from '../src/loader';

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
      expect(captured).toEqual({
        params: { id: 'abc' },
        url: '/posts/abc?q=1',
      });
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
});
