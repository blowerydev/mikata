import { describe, it, expect } from 'vitest';
import { _template, _insert, _createComponent } from '@mikata/runtime';
import { routeOutlet } from '@mikata/router';
import { renderRoute } from '../src/server';

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
});
