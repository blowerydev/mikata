import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Queries & mutations', section: 'State & Data', order: 2 };

const queryExample = await highlight(
  `import { createQuery } from '@mikata/store';

const userQuery = createQuery({
  key: () => ['user', userId()],
  fn: async ([, id], { signal }) => {
    const res = await fetch(\`/api/users/\${id}\`, { signal });
    if (!res.ok) throw new Error('Could not load user');
    return res.json() as Promise<User>;
  },
  enabled: () => userId() !== null,
  staleTime: 30_000,
  retry: 2,
  tags: () => ['user', \`user:\${userId()}\`],
});

export function UserPanel() {
  return (
    <section>
      {userQuery.isLoading() && <p>Loading...</p>}
      {userQuery.isError() && <p>{userQuery.error()?.message}</p>}
      {userQuery.isSuccess() && <h2>{userQuery.data()?.name}</h2>}
    </section>
  );
}`,
  'tsx',
);

const mutationExample = await highlight(
  `import { createMutation, invalidateTag } from '@mikata/store';

const saveUser = createMutation({
  fn: async (input: UserPatch) => {
    const res = await fetch(\`/api/users/\${input.id}\`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Could not save user');
    return res.json() as Promise<User>;
  },
  invalidates: (user) => ['user', \`user:\${user.id}\`],
});

await saveUser.mutate({ id: '42', name: 'Ada' });
await invalidateTag('user');`,
  'ts',
);

export default function Queries() {
  useMeta({
    title: 'Queries and mutations - @mikata/store',
    description: 'Fetch, cache, refetch, and invalidate async data with Mikata queries.',
  });

  return (
    <article>
      <h1>Queries &amp; mutations</h1>
      <p>
        Queries wrap async reads in Mikata signals. They track status, cache
        hydrated SSR data, abort obsolete requests, retry failures, and refetch
        when their reactive key changes.
      </p>

      <h2>Create a query</h2>
      <p>
        Provide a reactive <code>key</code> and an async <code>fn</code>. The
        fetch function receives the current key and an <code>AbortSignal</code>
        so it can cancel older requests when the key changes.
      </p>
      <CodeBlock html={queryExample} />

      <table>
        <thead>
          <tr>
            <th>Result field</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>data</code>
            </td>
            <td>Read signal for the latest successful value.</td>
          </tr>
          <tr>
            <td>
              <code>error</code>
            </td>
            <td>Read signal for the latest failure.</td>
          </tr>
          <tr>
            <td>
              <code>status</code>
            </td>
            <td>
              <code>'idle'</code>, <code>'loading'</code>, <code>'error'</code>,
              or <code>'success'</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>isFetching</code>
            </td>
            <td>True while any fetch is in flight, including background refetches.</td>
          </tr>
          <tr>
            <td>
              <code>refetch()</code>
            </td>
            <td>Runs the query function with the current key.</td>
          </tr>
        </tbody>
      </table>

      <h2>Cache keys and SSR</h2>
      <p>
        Keys are deterministically stringified for hydration. During server
        rendering, queries register with the SSR registry so the renderer can
        await the first fetch and embed the data. On the client, matching keys
        read from <code>window.__MIKATA_STATE__</code> before fetching again.
      </p>

      <h2>Mutations and tags</h2>
      <p>
        Mutations track their own status and can invalidate query tags after a
        successful write. Invalidations refetch matching queries once even when
        several tags point to the same query.
      </p>
      <CodeBlock html={mutationExample} />

      <h2>Loading strategies</h2>
      <ul>
        <li>
          Use <code>initialData</code> when a parent route already loaded the
          first value.
        </li>
        <li>
          Use <code>enabled</code> to wait for required params or auth state.
        </li>
        <li>
          Use <code>suspend: true</code> inside a Mikata <code>&lt;Suspense&gt;</code>
          boundary for the first fetch only.
        </li>
        <li>
          Use <code>retry: false</code> for validation-style requests that should
          fail immediately.
        </li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/state/stores">Stores</Link> covers structured client state.
        </li>
        <li>
          <Link to="/app/api-routes">API routes</Link> shows a server endpoint
          shape that pairs well with queries.
        </li>
      </ul>
    </article>
  );
}
