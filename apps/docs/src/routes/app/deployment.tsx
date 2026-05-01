import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Deployment', section: 'App Framework', order: 10 };

const staticConfig = await highlight(
  `// vite.config.ts
mikataKit({
  prerender: {
    outDir: 'dist/static',
    clientDir: 'dist/client',
    notFoundHtml: true,
  },
})`,
  'ts',
);

const nodeServer = await highlight(
  `// server.js
import http from 'node:http';
import { createRequestHandler } from '@mikata/kit/adapter-node';
import * as serverEntry from './dist/server/entry-server.js';

const handler = createRequestHandler({
  clientDir: 'dist/client',
  serverEntry,
  trustProxy: true,
});

http.createServer(handler).listen(process.env.PORT ?? 3000);`,
  'js',
);

const edgeHandler = await highlight(
  `import { createFetchHandler } from '@mikata/kit/adapter-edge';
import template from './dist/client/index.html?raw';
import * as serverEntry from './dist/server/entry-server.js';

export default {
  fetch: createFetchHandler({ template, serverEntry }),
};`,
  'ts',
);

export default function Deployment() {
  useMeta({
    title: 'Deployment - Mikata Kit',
    description: 'Deploy Mikata Kit apps to static hosts, Node servers, and edge runtimes.',
  });

  return (
    <article>
      <h1>Deployment</h1>
      <p>
        Choose the deployment shape from the features your app needs. Static
        hosts are ideal for prerendered pages, Node is the most complete server
        target, and edge runtimes fit Fetch-style deployments.
      </p>

      <h2>Static hosts</h2>
      <p>
        Enable prerendering and publish <code>dist/static</code>. This works for
        GitHub Pages, Netlify static output, Cloudflare Pages static output, and
        any host that serves files.
      </p>
      <CodeBlock html={staticConfig} />
      <ul>
        <li>Use <code>getStaticPaths()</code> for dynamic routes.</li>
        <li>API routes and server actions need a server runtime.</li>
        <li>Emit <code>404.html</code> when the host supports static not-found pages.</li>
      </ul>

      <h2>Node server</h2>
      <p>
        Use the Node adapter when you need SSR, API routes, form actions,
        redirects, cookies, or server-only dependencies. The adapter serves
        built client assets and dispatches dynamic requests through Kit.
      </p>
      <CodeBlock html={nodeServer} />

      <h2>Edge runtime</h2>
      <p>
        Use the edge adapter for platforms that call a Fetch handler. The
        platform should serve static assets; the adapter handles SSR, API
        dispatch, enhanced forms, redirects, and cookies for dynamic requests.
      </p>
      <CodeBlock html={edgeHandler} />

      <h2>Host checklist</h2>
      <table>
        <thead>
          <tr>
            <th>Need</th>
            <th>Recommended target</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Marketing site or docs</td>
            <td>Prerendered static output.</td>
          </tr>
          <tr>
            <td>Login, sessions, mutations</td>
            <td>Node or edge runtime.</td>
          </tr>
          <tr>
            <td>Server-only Node libraries</td>
            <td>Node runtime.</td>
          </tr>
          <tr>
            <td>Global low-latency SSR</td>
            <td>Edge runtime, if dependencies are Fetch-compatible.</td>
          </tr>
        </tbody>
      </table>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/ssr-ssg">SSR, SSG, adapters</Link> explains the render
          modes behind each recipe.
        </li>
        <li>
          <Link to="/start/project-structure">Project structure</Link> shows
          the generated entry files for Kit apps.
        </li>
      </ul>
    </article>
  );
}
