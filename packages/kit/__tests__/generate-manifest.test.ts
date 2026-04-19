import { describe, it, expect } from 'vitest';
import { scanRoutes } from '../src/scan-routes';
import { generateManifestModule } from '../src/generate-manifest';

const ROUTES_DIR = '/abs/project/src/routes';

describe('generateManifestModule', () => {
  it('emits dynamic imports anchored at the routes directory', () => {
    const manifest = scanRoutes(['index.tsx', 'about.tsx']);
    const src = generateManifestModule({ routesDir: ROUTES_DIR, manifest });
    expect(src).toContain('import("/abs/project/src/routes/index.tsx")');
    expect(src).toContain('import("/abs/project/src/routes/about.tsx")');
    // Dynamic, so Vite can code-split.
    expect(src).not.toMatch(/^import\s/m);
  });

  it('exports default + named `routes`', () => {
    const manifest = scanRoutes(['index.tsx']);
    const src = generateManifestModule({ routesDir: ROUTES_DIR, manifest });
    expect(src).toContain('export const routes =');
    expect(src).toContain('export default routes;');
  });

  it('produces route entries with path + lazy', () => {
    const manifest = scanRoutes(['users/[id].tsx']);
    const src = generateManifestModule({ routesDir: ROUTES_DIR, manifest });
    expect(src).toContain('path: "/users/:id"');
    expect(src).toContain('lazy:');
  });

  it('nests routes under layouts', () => {
    const manifest = scanRoutes([
      '_layout.tsx',
      'users/_layout.tsx',
      'users/index.tsx',
      'users/[id].tsx',
    ]);
    const src = generateManifestModule({ routesDir: ROUTES_DIR, manifest });
    // The root layout wraps the user layout, which wraps two leaf routes.
    // The exact nesting is an implementation detail, but every route's
    // dynamic import must still be present.
    expect(src).toContain('/abs/project/src/routes/_layout.tsx');
    expect(src).toContain('/abs/project/src/routes/users/_layout.tsx');
    expect(src).toContain('/abs/project/src/routes/users/index.tsx');
    expect(src).toContain('/abs/project/src/routes/users/[id].tsx');
    // The layout has children. Look for a `children: [` span anywhere.
    expect(src).toMatch(/children:\s*\[/);
  });

  it('produces syntactically valid JS', () => {
    const manifest = scanRoutes([
      '_layout.tsx',
      'index.tsx',
      'users/[id].tsx',
      'docs/[...slug].tsx',
    ]);
    const src = generateManifestModule({ routesDir: ROUTES_DIR, manifest });
    // Parse as JS by evaluating in a fresh Function. If the string isn't
    // valid JavaScript this throws SyntaxError.
    expect(() => new Function(src.replaceAll('import(', 'Promise.resolve(').replaceAll('export const', 'const').replaceAll('export default', ';'))).not.toThrow();
  });
});

describe('generateManifestModule: empty manifest', () => {
  it('still exports `routes` as an empty array', () => {
    const src = generateManifestModule({
      routesDir: ROUTES_DIR,
      manifest: { routes: [], layouts: [], apiRoutes: [] },
    });
    expect(src).toContain('export const routes = [];');
    expect(src).toContain('export default routes;');
  });

  it('always exports `apiRoutes` — empty array when no API routes detected', () => {
    const src = generateManifestModule({
      routesDir: ROUTES_DIR,
      manifest: { routes: [], layouts: [], apiRoutes: [] },
    });
    expect(src).toContain('export const apiRoutes = [];');
  });
});

describe('generateManifestModule: API routes', () => {
  it('emits apiRoutes as a flat list of { path, lazy } entries', () => {
    const manifest = scanRoutes(
      ['api/users.ts', 'api/users/[id].ts', 'index.tsx'],
      { apiFiles: new Set(['api/users.ts', 'api/users/[id].ts']) },
    );
    const src = generateManifestModule({ routesDir: ROUTES_DIR, manifest });
    expect(src).toContain('export const apiRoutes = [');
    expect(src).toContain('path: "/api/users"');
    expect(src).toContain('path: "/api/users/:id"');
    expect(src).toContain('import("/abs/project/src/routes/api/users.ts")');
    expect(src).toContain('import("/abs/project/src/routes/api/users/[id].ts")');
    // API entries are flat: no layouts, no children.
    const apiBlock = src.slice(src.indexOf('export const apiRoutes'));
    expect(apiBlock).not.toMatch(/children:/);
  });

  it('keeps page routes out of the apiRoutes list', () => {
    const manifest = scanRoutes(
      ['api/ping.ts', 'index.tsx'],
      { apiFiles: new Set(['api/ping.ts']) },
    );
    const src = generateManifestModule({ routesDir: ROUTES_DIR, manifest });
    const apiBlock = src.slice(
      src.indexOf('export const apiRoutes'),
      src.indexOf('export default'),
    );
    // The apiRoutes array should contain the API path but not the page
    // path. Imports live above this block so we compare on the string
    // paths emitted inside the entries.
    expect(apiBlock).toContain('"/api/ping"');
    expect(apiBlock).not.toContain('"/"');
  });
});

describe('generateManifestModule: 404 route', () => {
  it('emits a named `notFound` export when the manifest has one', () => {
    const manifest = scanRoutes(['index.tsx', '404.tsx']);
    const src = generateManifestModule({ routesDir: ROUTES_DIR, manifest });
    expect(src).toContain('export const notFound =');
    expect(src).toContain('import("/abs/project/src/routes/404.tsx")');
  });

  it('omits the `notFound` export when no 404 route exists', () => {
    const manifest = scanRoutes(['index.tsx']);
    const src = generateManifestModule({ routesDir: ROUTES_DIR, manifest });
    expect(src).not.toContain('export const notFound');
  });
});
