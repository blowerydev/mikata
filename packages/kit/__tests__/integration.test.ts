import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import mikataKit from '../src/plugin';
import { renderRoute } from '../src/server';
import type { RouteDefinition } from '@mikata/router';

// Route files live in an OS temp dir with no node_modules, so bare
// `@mikata/runtime` specifiers can't be resolved. Pre-resolve the entry
// once and splice its `file://` URL into the test route sources.
const require = createRequire(import.meta.url);
const RUNTIME_URL = pathToFileURL(require.resolve('@mikata/runtime')).href;

// Exercises the full chain — scanner → manifest generator → Vite plugin
// resolveId/load → dynamic import → renderRoute — so a regression in
// any one link fails here even though each is unit-tested in isolation.

const tempRoots: string[] = [];
afterEach(async () => {
  while (tempRoots.length) {
    await fs.rm(tempRoots.pop()!, { recursive: true, force: true });
  }
});

async function mkProject(files: Record<string, string>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mikata-kit-e2e-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(root, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }
  tempRoots.push(root);
  return root;
}

async function loadManifest(root: string): Promise<readonly RouteDefinition[]> {
  // `.mjs` so Node treats the files as ESM without needing a package.json;
  // the scanner's default extension list doesn't include `.mjs`, so we
  // opt in explicitly here.
  const plugin = mikataKit({ extensions: ['.mjs'] });
  (plugin.configResolved as (c: any) => void)({ root });
  const resolvedId = (plugin.resolveId as (id: string) => string)(
    'virtual:mikata-routes',
  );
  const src = (await (plugin.load as (id: string) => Promise<string>)(
    resolvedId,
  )) as string;
  // Generated source uses bare absolute paths for its dynamic imports.
  // Node ESM needs `file://` URLs, so we patch the specifiers before
  // writing the manifest to disk and importing it.
  const patched = src.replace(
    /import\((["'])([^"']+)\1\)/g,
    (_m, _q, spec) => `import(${JSON.stringify(pathToFileURL(spec).href)})`,
  );
  // Vitest's resolver refuses to load modules from outside the project
  // tree, so we inline the generated manifest as a `data:` URL. The
  // route imports inside it are already absolute `file://` URLs (patched
  // above), so the resolver-less data-URL context can still reach them.
  const dataUrl =
    'data:text/javascript;base64,' +
    Buffer.from(patched, 'utf8').toString('base64');
  const mod = (await import(/* @vite-ignore */ dataUrl)) as {
    default: RouteDefinition[];
  };
  return mod.default;
}

// Raw JS that mirrors what the compiler emits for a JSX element tree.
// Kept intentionally bare so the test has no compiler dependency.
const homeRoute = `
import { _template, _insert, _createComponent } from '${RUNTIME_URL}';
function Home() {
  const root = _template('<h1>Home <!>!</h1>').cloneNode(true);
  _insert(root, () => 'page', root.childNodes[1]);
  return root;
}
export default () => _createComponent(Home, {});
`.trim();

const aboutRoute = `
import { _template, _insert, _createComponent } from '${RUNTIME_URL}';
function About() {
  const root = _template('<h1>About <!>!</h1>').cloneNode(true);
  _insert(root, () => 'page', root.childNodes[1]);
  return root;
}
export default () => _createComponent(About, {});
`.trim();

describe('kit: end-to-end plugin → manifest → renderRoute', () => {
  it('SSRs a static route through the full pipeline', async () => {
    const root = await mkProject({
      'src/routes/index.mjs': homeRoute,
      'src/routes/about.mjs': aboutRoute,
    });
    const routes = await loadManifest(root);

    const { html: home, status: homeStatus } = await renderRoute(routes, {
      url: '/',
    });
    expect(homeStatus).toBe(200);
    expect(home).toContain('Home page');
    expect(home).not.toContain('About');

    const { html: about, status: aboutStatus } = await renderRoute(routes, {
      url: '/about',
    });
    expect(aboutStatus).toBe(200);
    expect(about).toContain('About page');
  });

  it('returns 404 through the pipeline for an unmatched URL', async () => {
    const root = await mkProject({
      'src/routes/index.mjs': homeRoute,
    });
    const routes = await loadManifest(root);
    const { status } = await renderRoute(routes, { url: '/nowhere' });
    expect(status).toBe(404);
  });

  it('resolves a dynamic [id] segment from the scanner convention', async () => {
    const root = await mkProject({
      'src/routes/users/[id].mjs': `
import { _template, _insert, _createComponent } from '${RUNTIME_URL}';
function User() {
  const root = _template('<p>user <!>!</p>').cloneNode(true);
  _insert(root, () => 'page', root.childNodes[1]);
  return root;
}
export default () => _createComponent(User, {});
      `.trim(),
    });
    const routes = await loadManifest(root);
    const { html, status } = await renderRoute(routes, { url: '/users/42' });
    expect(status).toBe(200);
    expect(html).toContain('user page');
  });
});

// The .mikata-manifest.mjs import above leaks the generated route module
// into Node's ESM cache; import keys differ per temp dir so this doesn't
// cross-pollute between tests.
