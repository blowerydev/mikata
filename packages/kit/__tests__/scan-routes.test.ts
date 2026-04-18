import { describe, it, expect } from 'vitest';
import { scanRoutes } from '../src/scan-routes';

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
