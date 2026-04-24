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

describe('mikataKit() transformIndexHtml', () => {
  // The Vite `transformIndexHtml` hook on a plugin can be either a
  // function or a `{ handler, order }` object. The tests call the hook
  // directly - extract the callable from whichever shape the plugin uses.
  function callTransform(plugin: ReturnType<typeof mikataKit>, html = '<html><head></head><body></body></html>'):
    { html: string; tags: Array<{ tag: string; attrs?: Record<string, string>; children?: string; injectTo: string }> } | undefined {
    const hook = plugin.transformIndexHtml as unknown;
    if (!hook) return undefined;
    const fn = typeof hook === 'function'
      ? hook
      : (hook as { handler: (...a: unknown[]) => unknown }).handler;
    return fn(html, { path: '/', filename: 'index.html', server: undefined as never, originalUrl: '/' }) as ReturnType<typeof callTransform>;
  }

  it('emits no tags when neither css nor colorSchemeInit is set', () => {
    const plugin = mikataKit();
    const result = callTransform(plugin);
    expect(result).toBeUndefined();
  });

  it('injects an inline script for colorSchemeInit: true', () => {
    const plugin = mikataKit({ colorSchemeInit: true });
    const result = callTransform(plugin)!;
    expect(result.tags).toHaveLength(1);
    expect(result.tags[0]!.tag).toBe('script');
    expect(result.tags[0]!.injectTo).toBe('head-prepend');
    // Defaults land in the emitted script.
    expect(result.tags[0]!.children).toContain('"mikata-color-scheme"');
    expect(result.tags[0]!.children).toContain('"data-mkt-color-scheme"');
    expect(result.tags[0]!.children).toContain('prefers-color-scheme: dark');
  });

  it('honours custom storageKey, attribute, and fallback', () => {
    const plugin = mikataKit({
      colorSchemeInit: {
        storageKey: 'app-theme',
        attribute: 'data-theme',
        fallback: 'dark',
      },
    });
    const result = callTransform(plugin)!;
    const body = result.tags[0]!.children!;
    expect(body).toContain('"app-theme"');
    expect(body).toContain('"data-theme"');
    expect(body).toContain('"dark"');
    // Defaults should be absent when overrides supplied.
    expect(body).not.toContain('"mikata-color-scheme"');
  });

  it('emits link tags for each css entry', () => {
    const plugin = mikataKit({ css: ['./src/styles.css', 'src/print.css'] });
    const result = callTransform(plugin)!;
    expect(result.tags).toHaveLength(2);
    expect(result.tags[0]).toMatchObject({
      tag: 'link',
      attrs: { rel: 'stylesheet', href: '/src/styles.css' },
      injectTo: 'head-prepend',
    });
    expect(result.tags[1]!.attrs!.href).toBe('/src/print.css');
  });

  it('accepts a single css string', () => {
    const plugin = mikataKit({ css: '/app/main.css' });
    const result = callTransform(plugin)!;
    expect(result.tags).toHaveLength(1);
    expect(result.tags[0]!.attrs!.href).toBe('/app/main.css');
  });

  it('passes fully-qualified URLs through unchanged', () => {
    const plugin = mikataKit({ css: 'https://fonts.googleapis.com/x.css' });
    const result = callTransform(plugin)!;
    expect(result.tags[0]!.attrs!.href).toBe('https://fonts.googleapis.com/x.css');
  });

  it('orders the color-scheme script before css links so it runs first', () => {
    const plugin = mikataKit({
      colorSchemeInit: true,
      css: ['./src/styles.css'],
    });
    const result = callTransform(plugin)!;
    expect(result.tags[0]!.tag).toBe('script');
    expect(result.tags[1]!.tag).toBe('link');
  });
});
