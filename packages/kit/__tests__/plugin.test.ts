import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import mikataKit from '../src/plugin';

async function mkTempRoutes(files: Record<string, string>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mikata-kit-test-'));
  const routesDir = path.join(root, 'src', 'routes');
  await fs.mkdir(routesDir, { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(routesDir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }
  return root;
}

const createdRoots: string[] = [];
afterEach(async () => {
  while (createdRoots.length) {
    const p = createdRoots.pop()!;
    await fs.rm(p, { recursive: true, force: true });
  }
});

describe('mikataKit() Vite plugin', () => {
  it('resolves and loads the virtual route module', async () => {
    const root = await mkTempRoutes({
      'index.tsx': 'export default () => null;',
      'about.tsx': 'export default () => null;',
      'users/[id].tsx': 'export default () => null;',
    });
    createdRoots.push(root);
    const plugin = mikataKit();

    // Simulate Vite's configResolved → resolveId → load lifecycle.
    const configResolved = plugin.configResolved as (config: any) => void;
    configResolved({ root });
    const resolve = plugin.resolveId as (id: string) => string | null;
    const resolved = resolve('virtual:mikata-routes');
    expect(resolved).toBeTruthy();
    const load = plugin.load as (id: string) => Promise<string | null> | string | null;
    const src = await load(resolved!);
    expect(typeof src).toBe('string');
    expect(src).toContain('export default routes');
    expect(src).toContain('/users/:id');
  });

  it('resolveId returns null for unrelated ids', () => {
    const plugin = mikataKit();
    const resolve = plugin.resolveId as (id: string) => string | null;
    expect(resolve('some-npm-package')).toBeNull();
  });

  it('load returns null for non-virtual ids', async () => {
    const plugin = mikataKit();
    const load = plugin.load as (id: string) => Promise<string | null> | string | null;
    expect(await load('/abs/some/file.ts')).toBeNull();
  });

  it('emits an empty manifest when the routes dir does not exist', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mikata-kit-empty-'));
    createdRoots.push(root);
    const plugin = mikataKit();
    (plugin.configResolved as (c: any) => void)({ root });
    const resolved = (plugin.resolveId as (id: string) => string)('virtual:mikata-routes');
    const src = await (plugin.load as (id: string) => Promise<string>)(resolved);
    expect(src).toContain('export const routes = [];');
  });

  it('honours custom routesDir', async () => {
    const root = await mkTempRoutes({});
    createdRoots.push(root);
    // Move the routes to a non-default location.
    const custom = path.join(root, 'app', 'pages');
    await fs.mkdir(custom, { recursive: true });
    await fs.writeFile(path.join(custom, 'index.tsx'), 'export default () => null;');

    const plugin = mikataKit({ routesDir: 'app/pages' });
    (plugin.configResolved as (c: any) => void)({ root });
    const resolved = (plugin.resolveId as (id: string) => string)('virtual:mikata-routes');
    const src = await (plugin.load as (id: string) => Promise<string>)(resolved);
    expect(src).toContain('app/pages/index.tsx');
    expect(src).toContain('path: "/"');
  });
});
