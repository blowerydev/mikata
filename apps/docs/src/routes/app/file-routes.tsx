import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'File routes', section: 'App Framework', order: 2 };

const routeTree = await highlight(
  `src/routes/
  index.tsx              /
  about.tsx              /about
  users/
    index.tsx            /users
    [id].tsx             /users/:id
    [...rest].tsx        /users/*
  api/
    ping.ts              /api/ping
  404.tsx                not-found fallback`,
  'text',
);

const pageExample = await highlight(
  `// src/routes/users/[id].tsx
export const nav = {
  title: 'User detail',
  section: 'Users',
  order: 20,
};

export default function UserPage() {
  return <h1>User detail</h1>;
}`,
  'tsx',
);

const apiExample = await highlight(
  `// src/routes/api/ping.ts
import type { ApiContext } from '@mikata/kit/api';

export function GET({ url }: ApiContext) {
  return Response.json({ ok: true, from: url.pathname });
}`,
  'ts',
);

export default function FileRoutes() {
  useMeta({
    title: 'File routes - Mikata Kit',
    description: 'Create Mikata Kit pages and API endpoints from files.',
  });

  return (
    <article>
      <h1>File routes</h1>
      <p>
        Kit turns files under <code>src/routes</code> into pages, layouts, API
        endpoints, and the generated route manifest consumed by the client,
        server renderer, and prerenderer.
      </p>

      <h2>Route naming</h2>
      <p>
        Route paths come from file and folder names. <code>index.tsx</code>
        maps to the parent path, bracket segments become params, and a top-level
        <code>404.tsx</code> is used when no route matches.
      </p>
      <CodeBlock html={routeTree} />

      <table>
        <thead>
          <tr>
            <th>Pattern</th>
            <th>Generated route</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>index.tsx</code>
            </td>
            <td>The current folder path, such as <code>/</code> or <code>/users</code>.</td>
          </tr>
          <tr>
            <td>
              <code>about.tsx</code>
            </td>
            <td>A static page at <code>/about</code>.</td>
          </tr>
          <tr>
            <td>
              <code>[id].tsx</code>
            </td>
            <td>A dynamic segment exposed as <code>params.id</code>.</td>
          </tr>
          <tr>
            <td>
              <code>[...slug].tsx</code>
            </td>
            <td>A catch-all route exposed as <code>params['*']</code>.</td>
          </tr>
          <tr>
            <td>
              <code>_layout.tsx</code>
            </td>
            <td>A wrapper for the folder subtree, not a URL by itself.</td>
          </tr>
        </tbody>
      </table>

      <h2>Pages</h2>
      <p>
        A page route has a default export. Optional named exports such as
        <code>load</code>, <code>action</code>, <code>getStaticPaths</code>, and
        <code>nav</code> add data loading, form handling, prerender paths, and
        docs-style navigation metadata.
      </p>
      <CodeBlock html={pageExample} />

      <h2>API endpoints</h2>
      <p>
        A route file with HTTP method exports and no default export becomes an
        API route. API modules share the same file naming rules as pages, so
        <code>src/routes/api/users/[id].ts</code> handles
        <code>/api/users/:id</code>.
      </p>
      <CodeBlock html={apiExample} />

      <h2>Ignored files</h2>
      <p>
        Files prefixed with <code>_</code> are ignored unless the file is named
        <code>_layout</code>. Use that convention for colocated helpers, server
        utilities, and component fragments that should not become routes.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/layouts">Layouts</Link> covers <code>_layout.tsx</code>
          and nested route outlets.
        </li>
        <li>
          <Link to="/app/loaders">Loaders</Link> shows how params flow into
          server and client data loading.
        </li>
        <li>
          <Link to="/app/api-routes">API routes</Link> documents method
          handlers in depth.
        </li>
      </ul>
    </article>
  );
}
