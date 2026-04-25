import { describe, it, expect, vi } from 'vitest';
import { generateNavModule } from '../src/generate-nav';
import type { NavEntry, RouteManifest } from '../src/scan-routes';

function manifestOf(routes: { path: string; file: string }[]): RouteManifest {
  return {
    routes: routes.map((r) => ({
      path: r.path,
      file: r.file,
      layouts: [],
      id: `route:${r.file}`,
    })),
    layouts: [],
    apiRoutes: [],
  };
}

describe('generateNavModule', () => {
  it('fills `path` from the manifest for single-entry nav', () => {
    const manifest = manifestOf([
      { path: '/start/install', file: 'start/install.tsx' },
    ]);
    const navByFile = new Map<string, NavEntry | NavEntry[]>([
      ['start/install.tsx', { title: 'Install', section: 'Start', order: 2 }],
    ]);
    const { entries } = generateNavModule({ manifest, navByFile });
    expect(entries).toEqual([
      { title: 'Install', section: 'Start', order: 2, path: '/start/install' },
    ]);
  });

  it('emits one entry per item in array-form nav (dynamic routes)', () => {
    const manifest = manifestOf([
      { path: '/reference/:package', file: 'reference/[package].tsx' },
    ]);
    const navByFile = new Map<string, NavEntry | NavEntry[]>([
      [
        'reference/[package].tsx',
        [
          { path: '/reference/a', title: '@mikata/a', section: 'Reference' },
          { path: '/reference/b', title: '@mikata/b', section: 'Reference' },
        ],
      ],
    ]);
    const { entries } = generateNavModule({ manifest, navByFile });
    expect(entries).toEqual([
      { path: '/reference/a', title: '@mikata/a', section: 'Reference' },
      { path: '/reference/b', title: '@mikata/b', section: 'Reference' },
    ]);
  });

  it('routes without nav are omitted', () => {
    const manifest = manifestOf([
      { path: '/about', file: 'about.tsx' },
      { path: '/contact', file: 'contact.tsx' },
    ]);
    const navByFile = new Map<string, NavEntry | NavEntry[]>([
      ['about.tsx', { title: 'About', section: 'Pages' }],
    ]);
    const { entries } = generateNavModule({ manifest, navByFile });
    expect(entries.map((e) => e.title)).toEqual(['About']);
  });

  it('preserves scanner source order across files', () => {
    const manifest = manifestOf([
      { path: '/a', file: 'a.tsx' },
      { path: '/b', file: 'b.tsx' },
      { path: '/c', file: 'c.tsx' },
    ]);
    const navByFile = new Map<string, NavEntry | NavEntry[]>([
      ['c.tsx', { title: 'C', section: 'X' }],
      ['a.tsx', { title: 'A', section: 'X' }],
      ['b.tsx', { title: 'B', section: 'X' }],
    ]);
    const { entries } = generateNavModule({ manifest, navByFile });
    expect(entries.map((e) => e.title)).toEqual(['A', 'B', 'C']);
  });

  it('warns and skips array entries that lack `path`', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const manifest = manifestOf([
        { path: '/items/:id', file: 'items/[id].tsx' },
      ]);
      const navByFile = new Map<string, NavEntry | NavEntry[]>([
        [
          'items/[id].tsx',
          [
            { path: '/items/a', title: 'A', section: 'X' },
            { title: 'B', section: 'X' } as NavEntry,
          ],
        ],
      ]);
      const { entries } = generateNavModule({ manifest, navByFile });
      expect(entries.map((e) => e.title)).toEqual(['A']);
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });

  it('emits a module that default-exports the nav array', () => {
    const manifest = manifestOf([{ path: '/x', file: 'x.tsx' }]);
    const navByFile = new Map<string, NavEntry | NavEntry[]>([
      ['x.tsx', { title: 'X', section: 'S' }],
    ]);
    const { source } = generateNavModule({ manifest, navByFile });
    expect(source).toContain('export const nav =');
    expect(source).toContain('export default nav;');
    expect(source).toContain('"path": "/x"');
  });
});
