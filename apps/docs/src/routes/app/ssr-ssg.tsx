import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'SSR, SSG, adapters', section: 'App Framework', order: 9 };

const serverEntry = await highlight(
  `// src/entry-server.tsx
import { renderRoute } from '@mikata/kit/server';
import * as manifest from 'virtual:mikata-routes';

export function render(url: string, request?: Request) {
  return renderRoute(manifest, { url, request });
}`,
  'tsx',
);

const clientEntry = await highlight(
  `// src/entry-client.tsx
import { mount } from '@mikata/kit/client';
import * as manifest from 'virtual:mikata-routes';

mount(manifest, document.getElementById('root')!);`,
  'tsx',
);

const pathsExample = await highlight(
  `// src/routes/blog/[slug].tsx
export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.map((post) => ({
    params: { slug: post.slug },
  }));
}`,
  'tsx',
);

const viteExample = await highlight(
  `mikataKit({
  ssr: { entry: '/src/entry-server.tsx' },
  prerender: {
    outDir: 'dist/static',
    clientDir: 'dist/client',
    fallback: 'error',
  },
})`,
  'ts',
);

export default function SsrSsg() {
  useMeta({
    title: 'SSR, SSG, and adapters - Mikata Kit',
    description: 'Render Mikata Kit apps on the server, prerender static pages, and deploy adapters.',
  });

  return (
    <article>
      <h1>SSR, SSG, adapters</h1>
      <p>
        Kit can render routes per request, prerender them to static HTML during
        build, or do both in the same project. The same generated route manifest
        powers each mode.
      </p>

      <h2>Server rendering</h2>
      <p>
        <code>renderRoute()</code> resolves the matched route modules, runs
        mutating actions when needed, runs matched loaders, collects metadata,
        and returns HTML plus serialized route state.
      </p>
      <CodeBlock html={serverEntry} />

      <h2>Hydration</h2>
      <p>
        The client entry mounts the generated manifest into the server-rendered
        root. Loader data, action data, route errors, CSRF state, and head state
        are reconnected before interactive navigation begins.
      </p>
      <CodeBlock html={clientEntry} />

      <h2>Static generation</h2>
      <p>
        The prerenderer discovers route leaves and renders concrete URLs to
        <code>dist/static</code>. Static routes are discovered automatically.
        Parametric routes need <code>getStaticPaths()</code> or explicit paths
        in plugin config.
      </p>
      <CodeBlock html={pathsExample} />

      <h2>Plugin options</h2>
      <p>
        Configure SSR and prerendering in <code>mikataKit()</code>. The default
        output pairs a client build with prerendered HTML, but Node and edge
        adapters can render missed or dynamic routes at request time.
      </p>
      <CodeBlock html={viteExample} />

      <h2>Adapter behavior</h2>
      <table>
        <thead>
          <tr>
            <th>Adapter</th>
            <th>Use it for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Node</td>
            <td>Asset serving, SSR, API routes, enhanced forms, body limits, and redirects.</td>
          </tr>
          <tr>
            <td>Edge</td>
            <td>Fetch-style runtimes where the platform serves static assets.</td>
          </tr>
          <tr>
            <td>Static</td>
            <td>Prebuilt HTML and client assets with no server execution.</td>
          </tr>
        </tbody>
      </table>

      <h2>Cache implications</h2>
      <p>
        Prerendered pages can be cached like static files. SSR responses depend
        on request cookies, actions, loaders, and API data, so set cache headers
        in your adapter or hosting layer based on the data each route reads.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/deployment">Deployment</Link> turns these modes into
          host-specific recipes.
        </li>
        <li>
          <Link to="/app/metadata">Metadata &amp; head</Link> explains how SSR
          head tags are collected.
        </li>
      </ul>
    </article>
  );
}
