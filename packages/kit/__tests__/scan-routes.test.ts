import { describe, it, expect } from 'vitest';
import {
  scanRoutes,
  isApiRouteSource,
  extractNavExport,
} from '../src/scan-routes';

describe('scanRoutes: file → path conversion', () => {
  it('maps index.tsx to the parent path', () => {
    const m = scanRoutes(['index.tsx', 'about.tsx']);
    const paths = m.routes.map((r) => r.path).sort();
    expect(paths).toEqual(['/', '/about']);
  });

  it('converts [param].tsx to :param', () => {
    const m = scanRoutes(['users/[id].tsx']);
    expect(m.routes).toHaveLength(1);
    expect(m.routes[0]!.path).toBe('/users/:id');
  });

  it('converts [...rest].tsx to the router catch-all *', () => {
    const m = scanRoutes(['docs/[...slug].tsx']);
    expect(m.routes[0]!.path).toBe('/docs/*');
  });

  it('handles nested index files', () => {
    const m = scanRoutes(['users/index.tsx', 'users/[id].tsx']);
    const paths = m.routes.map((r) => r.path).sort();
    expect(paths).toEqual(['/users', '/users/:id']);
  });

  it('ignores files whose stem starts with underscore except _layout', () => {
    const m = scanRoutes([
      'index.tsx',
      '_helper.tsx',
      '_layout.tsx',
    ]);
    const paths = m.routes.map((r) => r.path).sort();
    expect(paths).toEqual(['/']);
    expect(m.layouts).toHaveLength(1);
  });

  it('ignores non-source extensions', () => {
    const m = scanRoutes(['index.tsx', 'README.md', 'styles.css']);
    expect(m.routes.map((r) => r.path)).toEqual(['/']);
  });

  it('accepts .mdx as a page route', () => {
    const m = scanRoutes(['index.tsx', 'guide.mdx']);
    const paths = m.routes.map((r) => r.path).sort();
    expect(paths).toEqual(['/', '/guide']);
  });

  it('applies dynamic-segment and layout rules to .mdx the same as .tsx', () => {
    const m = scanRoutes([
      '_layout.tsx',
      'docs/_layout.mdx',
      'docs/index.mdx',
      'docs/[slug].mdx',
    ]);
    const paths = m.routes.map((r) => r.path).sort();
    expect(paths).toEqual(['/docs', '/docs/:slug']);
    // Both the tsx root layout and the mdx docs layout should wrap the pages.
    const docsIndex = m.routes.find((r) => r.path === '/docs')!;
    expect(docsIndex.layouts).toEqual(['layout:/', 'layout:docs']);
  });
});

describe('scanRoutes: layouts', () => {
  it('links each route to the layouts wrapping it, outer-most first', () => {
    const m = scanRoutes([
      '_layout.tsx',
      'users/_layout.tsx',
      'users/index.tsx',
      'users/[id].tsx',
    ]);
    const usersIndex = m.routes.find((r) => r.path === '/users')!;
    const usersId = m.routes.find((r) => r.path === '/users/:id')!;
    expect(usersIndex.layouts).toEqual(['layout:/', 'layout:users']);
    expect(usersId.layouts).toEqual(['layout:/', 'layout:users']);
  });

  it('records layout parent chain', () => {
    const m = scanRoutes([
      '_layout.tsx',
      'admin/_layout.tsx',
      'admin/users/_layout.tsx',
      'admin/users/index.tsx',
    ]);
    const root = m.layouts.find((l) => l.id === 'layout:/')!;
    const admin = m.layouts.find((l) => l.id === 'layout:admin')!;
    const adminUsers = m.layouts.find((l) => l.id === 'layout:admin/users')!;
    expect(root.parent).toBe(null);
    expect(admin.parent).toBe('layout:/');
    expect(adminUsers.parent).toBe('layout:admin');
  });

  it('routes with no enclosing layout have an empty list', () => {
    const m = scanRoutes(['index.tsx', 'about.tsx']);
    for (const r of m.routes) expect(r.layouts).toEqual([]);
  });
});

describe('scanRoutes: 404 route', () => {
  it('records the top-level 404.tsx as notFound and excludes it from routes', () => {
    const m = scanRoutes(['index.tsx', '404.tsx']);
    expect(m.notFound).toBe('404.tsx');
    const paths = m.routes.map((r) => r.path);
    expect(paths).toEqual(['/']);
  });

  it('treats nested foo/404.tsx as a normal /foo/404 route', () => {
    const m = scanRoutes(['index.tsx', 'foo/404.tsx']);
    expect(m.notFound).toBeUndefined();
    const paths = m.routes.map((r) => r.path).sort();
    expect(paths).toEqual(['/', '/foo/404']);
  });

  it('omits notFound when no 404 file is present', () => {
    const m = scanRoutes(['index.tsx']);
    expect(m.notFound).toBeUndefined();
  });
});

describe('scanRoutes: API routes', () => {
  it('routes files listed in apiFiles into the apiRoutes list', () => {
    const m = scanRoutes(
      ['api/ping.ts', 'api/users/[id].ts', 'index.tsx'],
      { apiFiles: new Set(['api/ping.ts', 'api/users/[id].ts']) },
    );
    expect(m.apiRoutes.map((r) => r.path).sort()).toEqual([
      '/api/ping',
      '/api/users/:id',
    ]);
    // API files don't leak into the page routes list.
    expect(m.routes.map((r) => r.path)).toEqual(['/']);
  });

  it('emits an empty apiRoutes list when no apiFiles are passed', () => {
    const m = scanRoutes(['index.tsx', 'about.tsx']);
    expect(m.apiRoutes).toEqual([]);
  });

  it('does not associate API routes with layouts', () => {
    const m = scanRoutes(
      ['_layout.tsx', 'api/ping.ts', 'index.tsx'],
      { apiFiles: new Set(['api/ping.ts']) },
    );
    const api = m.apiRoutes.find((r) => r.path === '/api/ping')!;
    // ApiRouteManifestEntry has no `layouts` field — by contract, API
    // handlers don't render UI, so there's nothing to wrap. Check the
    // shape is exactly the flat one we expect.
    expect(Object.keys(api).sort()).toEqual(['file', 'id', 'path']);
  });
});

describe('isApiRouteSource', () => {
  it('treats a module with GET and no default export as an API route', () => {
    expect(
      isApiRouteSource(
        "export async function GET() { return new Response('ok'); }",
      ),
    ).toBe(true);
  });

  it('rejects modules that have a default export', () => {
    const src = `
      export default function Page() { return null; }
      export async function GET() { return new Response('ok'); }
    `;
    expect(isApiRouteSource(src)).toBe(false);
  });

  it('accepts any HTTP verb, not just GET', () => {
    for (const verb of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(
        isApiRouteSource(`export function ${verb}() { return new Response(); }`),
      ).toBe(true);
    }
  });

  it('accepts const-style verb exports', () => {
    expect(
      isApiRouteSource(
        'export const POST = async () => new Response("created");',
      ),
    ).toBe(true);
  });

  it('rejects a module with no verb exports', () => {
    expect(isApiRouteSource('export function helper() {}')).toBe(false);
  });
});

describe('extractNavExport', () => {
  it('returns null when no nav export is present', () => {
    expect(extractNavExport('export default function() {}')).toBeNull();
  });

  it('extracts a simple object literal', () => {
    const src = `export const nav = { title: 'Button', section: 'UI', order: 2 };`;
    expect(extractNavExport(src)).toEqual({
      title: 'Button',
      section: 'UI',
      order: 2,
    });
  });

  it('handles a TS type annotation between the binding and the value', () => {
    const src = `export const nav: NavEntry = { title: 'X', section: 'Y' };`;
    expect(extractNavExport(src)).toEqual({ title: 'X', section: 'Y' });
  });

  it('extracts an array literal for dynamic-route nav', () => {
    const src = `
      export const nav = [
        { path: '/reference/a', title: '@mikata/a', section: 'Reference', order: 1 },
        { path: '/reference/b', title: '@mikata/b', section: 'Reference', order: 2 },
      ];
    `;
    expect(extractNavExport(src)).toEqual([
      { path: '/reference/a', title: '@mikata/a', section: 'Reference', order: 1 },
      { path: '/reference/b', title: '@mikata/b', section: 'Reference', order: 2 },
    ]);
  });

  it('tolerates braces inside string values', () => {
    const src = `export const nav = { title: 'a } b', section: 'X' };`;
    expect(extractNavExport(src)).toEqual({ title: 'a } b', section: 'X' });
  });

  it('returns null for a non-literal expression (variable reference)', () => {
    // Build-time eval has no scope to read `someTitle` from.
    const src = `export const nav = { title: someTitle, section: 'X' };`;
    expect(extractNavExport(src)).toBeNull();
  });

  it('returns null for a malformed literal', () => {
    const src = `export const nav = { title: 'X', section: };`;
    expect(extractNavExport(src)).toBeNull();
  });

  it('ignores `nav` as a non-export binding', () => {
    const src = `const nav = { title: 'X' }; export default nav;`;
    expect(extractNavExport(src)).toBeNull();
  });

  it('ignores `nav`-prefixed names', () => {
    // `navigation`, `navBar`, etc. shouldn't match.
    const src = `export const navigation = { foo: 1 };`;
    expect(extractNavExport(src)).toBeNull();
  });
});

describe('scanRoutes: determinism', () => {
  it('is stable across input permutations', () => {
    const files = [
      'index.tsx',
      'users/[id].tsx',
      'users/index.tsx',
      '_layout.tsx',
    ];
    const a = scanRoutes(files);
    const b = scanRoutes([...files].reverse());
    expect(a).toEqual(b);
  });
});
