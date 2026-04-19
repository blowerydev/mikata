import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { _template, _insert, _createComponent } from '@mikata/runtime';
import { renderRoute } from '../src/server';
import {
  useMeta,
  createCollectMetaRegistry,
  createDomMetaRegistry,
  MANAGED_ATTR,
} from '../src/head';
import { spliceHead } from '../src/splice-head';

describe('createCollectMetaRegistry', () => {
  it('serialises a simple descriptor with title + description', () => {
    const r = createCollectMetaRegistry();
    r.register({ title: 'Hello', description: 'World' });
    expect(r.serialize()).toBe(
      '<title>Hello</title><meta name="description" content="World">',
    );
  });

  it('last-writer-wins for <title>', () => {
    const r = createCollectMetaRegistry();
    r.register({ title: 'layout' });
    r.register({ title: 'child' });
    const out = r.serialize();
    expect(out).toBe('<title>child</title>');
    expect(out).not.toContain('layout');
  });

  it('dedups <meta name="description"> across nested registrations', () => {
    const r = createCollectMetaRegistry();
    r.register({ description: 'parent description' });
    r.register({ description: 'child description' });
    const out = r.serialize();
    expect(out.match(/meta name="description"/g)).toHaveLength(1);
    expect(out).toContain('child description');
    expect(out).not.toContain('parent description');
  });

  it('dedups <meta property="..."> independently from name-keyed metas', () => {
    const r = createCollectMetaRegistry();
    r.register({
      meta: [
        { property: 'og:title', content: 'A' },
        { name: 'author', content: 'Alice' },
      ],
    });
    r.register({
      meta: [{ property: 'og:title', content: 'B' }],
    });
    const out = r.serialize();
    expect(out.match(/og:title/g)).toHaveLength(1);
    expect(out).toContain('"B"');
    expect(out).toContain('author'); // unaffected by og:title dedup
  });

  it('accumulates <link> entries without dedup (except canonical)', () => {
    const r = createCollectMetaRegistry();
    r.register({
      link: [
        { rel: 'stylesheet', href: '/a.css' },
        { rel: 'stylesheet', href: '/b.css' },
      ],
    });
    r.register({ link: [{ rel: 'canonical', href: '/first' }] });
    r.register({ link: [{ rel: 'canonical', href: '/override' }] });
    const out = r.serialize();
    expect(out.match(/stylesheet/g)).toHaveLength(2);
    expect(out.match(/canonical/g)).toHaveLength(1);
    expect(out).toContain('/override');
    expect(out).not.toContain('/first');
  });

  it('escapes attribute values and title text', () => {
    const r = createCollectMetaRegistry();
    r.register({
      title: 'A & B <c>',
      description: 'She said "hi" & \'bye\'',
    });
    const out = r.serialize();
    expect(out).toContain('<title>A &amp; B &lt;c&gt;</title>');
    expect(out).toContain(
      '<meta name="description" content="She said &quot;hi&quot; &amp; &#39;bye&#39;">',
    );
  });

  it('cleanup removes the registered entry before serialize', () => {
    const r = createCollectMetaRegistry();
    const dispose = r.register({ title: 'gone' });
    dispose();
    expect(r.serialize()).toBe('');
  });

  it('passes through arbitrary meta attributes (media, charset, etc.)', () => {
    const r = createCollectMetaRegistry();
    r.register({
      meta: [{ name: 'theme-color', content: '#000', media: '(prefers-color-scheme: dark)' }],
    });
    const out = r.serialize();
    expect(out).toContain('media="(prefers-color-scheme: dark)"');
  });
});

describe('createDomMetaRegistry', () => {
  function makeHead() {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
    return dom.window.document.head as unknown as HTMLElement;
  }

  it('appends tags to the target and marks them as managed', () => {
    const head = makeHead();
    const r = createDomMetaRegistry(head);
    r.register({ title: 'Hi', description: 'desc' });
    expect(head.querySelector('title')?.textContent).toBe('Hi');
    expect(head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('desc');
    expect(head.querySelectorAll(`[${MANAGED_ATTR}]`).length).toBe(2);
  });

  it('stack-based dedup restores the previous <title> on cleanup', () => {
    const head = makeHead();
    const r = createDomMetaRegistry(head);
    r.register({ title: 'parent' });
    const dispose = r.register({ title: 'child' });
    expect(head.querySelectorAll('title').length).toBe(1);
    expect(head.querySelector('title')?.textContent).toBe('child');
    dispose();
    expect(head.querySelectorAll('title').length).toBe(1);
    expect(head.querySelector('title')?.textContent).toBe('parent');
  });

  it('cleanup removes the tag entirely when stack empties', () => {
    const head = makeHead();
    const r = createDomMetaRegistry(head);
    const dispose = r.register({ title: 'only' });
    dispose();
    expect(head.querySelectorAll('title').length).toBe(0);
  });

  it('non-keyed tags accumulate and each registration cleans up its own', () => {
    const head = makeHead();
    const r = createDomMetaRegistry(head);
    const a = r.register({ link: [{ rel: 'stylesheet', href: '/a.css' }] });
    const b = r.register({ link: [{ rel: 'stylesheet', href: '/b.css' }] });
    expect(head.querySelectorAll('link').length).toBe(2);
    a();
    expect(head.querySelectorAll('link').length).toBe(1);
    expect(head.querySelector('link')?.getAttribute('href')).toBe('/b.css');
    b();
    expect(head.querySelectorAll('link').length).toBe(0);
  });

  it('leaves non-managed head tags alone during cleanup', () => {
    const dom = new JSDOM(
      '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
    );
    const head = dom.window.document.head as unknown as HTMLElement;
    const r = createDomMetaRegistry(head);
    const dispose = r.register({ title: 'adds' });
    dispose();
    // charset meta must still be there — it had no data-mikata-head marker.
    expect(head.querySelector('meta[charset]')).not.toBeNull();
  });
});

describe('spliceHead', () => {
  it('replaces the default marker with headTags', () => {
    const out = spliceHead(
      '<!doctype html><html><head><!--mikata-head--></head><body/></html>',
      '<title>X</title>',
      '<!--mikata-head-->',
    );
    expect(out).toContain('<head><title>X</title></head>');
  });

  it('falls back to injecting before </head> when the marker is absent', () => {
    const out = spliceHead(
      '<!doctype html><html><head><meta charset="utf-8"></head><body/></html>',
      '<title>X</title>',
      '<!--mikata-head-->',
    );
    expect(out).toContain('<meta charset="utf-8"><title>X</title></head>');
  });

  it('returns the template unchanged when headTags is empty', () => {
    const tpl = '<html><head></head><body/></html>';
    expect(spliceHead(tpl, '', '<!--mikata-head-->')).toBe(tpl);
  });

  it('returns the template unchanged when no marker and no </head>', () => {
    const tpl = '<body>only</body>';
    expect(spliceHead(tpl, '<title>X</title>', '<!--mikata-head-->')).toBe(tpl);
  });
});

describe('useMeta integrated via renderRoute', () => {
  it('collects head tags from route components and returns them', async () => {
    const Page = () => {
      useMeta({
        title: 'Users',
        description: 'All users',
        meta: [{ property: 'og:title', content: 'Users' }],
      });
      return _template('<p>users</p>').cloneNode(true) as never;
    };
    const routes = [
      { path: '/users', lazy: async () => ({ default: Page }) },
    ];
    const { headTags } = await renderRoute(routes, { url: '/users' });
    expect(headTags).toContain('<title>Users</title>');
    expect(headTags).toContain('name="description" content="All users"');
    expect(headTags).toContain('property="og:title"');
  });

  it('child route overrides parent layout title', async () => {
    const Layout = () => {
      useMeta({ title: 'parent title' });
      const root = _template('<div><!></div>').cloneNode(true) as any;
      const marker = root.childNodes[0];
      // Route outlet comes from the router at render time — for this test,
      // inline a child component via _createComponent.
      _insert(
        root,
        () => _createComponent(Child, {}),
        marker,
      );
      return root;
    };
    const Child = () => {
      useMeta({ title: 'child title' });
      return _template('<span>c</span>').cloneNode(true) as any;
    };
    const routes = [
      {
        path: '/',
        lazy: async () => ({ default: Layout }),
      },
    ];
    const { headTags } = await renderRoute(routes, { url: '/' });
    expect(headTags).toContain('<title>child title</title>');
    expect(headTags).not.toContain('parent title');
  });

  it('returns empty headTags when no route calls useMeta', async () => {
    const Page = () => _template('<p>p</p>').cloneNode(true) as never;
    const routes = [{ path: '/', lazy: async () => ({ default: Page }) }];
    const { headTags } = await renderRoute(routes, { url: '/' });
    expect(headTags).toBe('');
  });
});
