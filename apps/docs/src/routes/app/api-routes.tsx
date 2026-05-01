import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'API routes', section: 'App Framework', order: 6 };

const apiExample = await highlight(
  `// src/routes/api/users/[id].ts
import type { ApiContext } from '@mikata/kit/api';

export async function GET({ params }: ApiContext) {
  const user = await db.users.find(params.id);

  if (!user) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ user });
}

export async function PATCH({ request, params }: ApiContext) {
  const patch = await request.json();
  const user = await db.users.update(params.id, patch);
  return Response.json({ user });
}`,
  'ts',
);

const cookieExample = await highlight(
  `export function POST({ cookies }: ApiContext) {
  cookies.set('seen-api', '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });

  return Response.json({ ok: true });
}`,
  'ts',
);

export default function ApiRoutes() {
  useMeta({
    title: 'API routes - Mikata Kit',
    description: 'Build Fetch API endpoints inside a Mikata Kit route tree.',
  });

  return (
    <article>
      <h1>API routes</h1>
      <p>
        API routes are route files that export HTTP method handlers instead of
        a default component. They run before page rendering in Node and edge
        adapters and return standard Fetch <code>Response</code> objects.
      </p>

      <h2>Method handlers</h2>
      <p>
        Export <code>GET</code>, <code>POST</code>, <code>PUT</code>,
        <code>PATCH</code>, <code>DELETE</code>, <code>HEAD</code>, or
        <code>OPTIONS</code>. A module with method exports and no default export
        is treated as an API endpoint.
      </p>
      <CodeBlock html={apiExample} />

      <h2>Context</h2>
      <p>
        <code>ApiContext</code> includes the request, params, current URL, and
        cookie handle. Dynamic route naming works the same way it does for
        pages, including catch-all params as <code>params['*']</code>.
      </p>

      <table>
        <thead>
          <tr>
            <th>Behavior</th>
            <th>What Kit does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Unsupported method</td>
            <td>Returns <code>405</code> with an <code>Allow</code> header.</td>
          </tr>
          <tr>
            <td>Cookie writes</td>
            <td>Appends queued <code>Set-Cookie</code> headers to the response.</td>
          </tr>
          <tr>
            <td>Layouts</td>
            <td>Skipped. API routes do not render page components.</td>
          </tr>
          <tr>
            <td>CSRF</td>
            <td>Not applied automatically. Protect credentialed APIs explicitly.</td>
          </tr>
        </tbody>
      </table>

      <h2>Cookies</h2>
      <p>
        Cookie helpers work in API routes just like actions. Use them for
        session endpoints, preference endpoints, or small server-side flags.
      </p>
      <CodeBlock html={cookieExample} />

      <h2>Deployment notes</h2>
      <p>
        API routes require a runtime that can execute server code. They work
        with the Node and edge adapters, but a fully static prerendered build
        only emits page HTML and client assets.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/sessions">Cookies, sessions, CSRF</Link> covers signed
          session helpers.
        </li>
        <li>
          <Link to="/app/deployment">Deployment</Link> compares static, Node,
          and edge targets.
        </li>
      </ul>
    </article>
  );
}
