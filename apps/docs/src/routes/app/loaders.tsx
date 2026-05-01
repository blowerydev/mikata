import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Loaders', section: 'App Framework', order: 4 };

const loaderExample = await highlight(
  `// src/routes/users/[id].tsx
import { useLoaderData, type LoadContext } from '@mikata/kit/loader';

export async function load({ params, url, cookies }: LoadContext) {
  const tab = url.searchParams.get('tab') ?? 'overview';
  const theme = cookies.get('theme') ?? 'system';
  const user = await db.users.find(params.id);

  return { user, tab, theme };
}

export default function UserPage() {
  const data = useLoaderData<typeof load>();
  return <h1>{data()?.user.name}</h1>;
}`,
  'tsx',
);

const errorExample = await highlight(
  `export async function load({ params }: LoadContext) {
  const user = await db.users.find(params.id);

  if (!user) {
    throw new Error('User not found');
  }

  return { user };
}`,
  'tsx',
);

export default function Loaders() {
  useMeta({
    title: 'Loaders - Mikata Kit',
    description: 'Fetch route data with Mikata Kit loaders and useLoaderData.',
  });

  return (
    <article>
      <h1>Loaders</h1>
      <p>
        A route module can export <code>load()</code> to fetch data before the
        route renders. The server runs matched loaders for the initial request,
        serializes their results into the HTML, and the client reuses the same
        data during hydration.
      </p>

      <h2>Load context</h2>
      <p>
        <code>LoadContext</code> includes route params, the current
        <code>URL</code>, and a cookie handle. Loaders can be sync or async and
        should return JSON-serializable data for the client.
      </p>
      <CodeBlock html={loaderExample} />

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>params</code>
            </td>
            <td>Dynamic route values such as <code>id</code> or <code>params['*']</code>.</td>
          </tr>
          <tr>
            <td>
              <code>url</code>
            </td>
            <td>The full request URL, including search params.</td>
          </tr>
          <tr>
            <td>
              <code>cookies</code>
            </td>
            <td>A request cookie snapshot with queued writes for server responses.</td>
          </tr>
        </tbody>
      </table>

      <h2>Reading loader data</h2>
      <p>
        <code>useLoaderData&lt;typeof load&gt;()</code> returns a read signal
        for the current route module. During client navigation, Kit fetches the
        new route state and updates loader stores without remounting the whole
        app shell.
      </p>

      <h2>Errors</h2>
      <p>
        If a loader throws, Kit records the failure for that route. The server
        responds with a <code>500</code> status for the rendered request, and
        the client rethrows the rehydrated error when the route reads its data.
      </p>
      <CodeBlock html={errorExample} />

      <h2>Redirects</h2>
      <p>
        Current Kit redirects are action-oriented: return <code>redirect()</code>
        from an <code>action</code> after a form submission. For loader-time
        access control, render an appropriate page state or throw and handle it
        with your route boundary until loader redirects are added.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/actions">Actions &amp; forms</Link> covers mutations
          and redirect responses.
        </li>
        <li>
          <Link to="/app/sessions">Cookies, sessions, CSRF</Link> shows how to
          read signed session cookies in server code.
        </li>
      </ul>
    </article>
  );
}
