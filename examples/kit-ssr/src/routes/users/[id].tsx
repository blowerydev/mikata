import { useParams } from '@mikata/router';
import { useLoaderData, type LoadContext } from '@mikata/kit/loader';
import { useMeta } from '@mikata/kit/head';

// Runs on the server before the route renders AND on the client each
// time the URL's `:id` changes (e.g. navigating from /users/1 to /users/2).
// The returned value is embedded into the page shell on SSR and replayed
// on the client so the first paint is already populated; subsequent
// client-side navigations re-invoke this function and update the store.
export async function load({ params }: LoadContext) {
  // Pretend this hit a database — a tiny delay keeps the point honest
  // (the HTML response still waits for it before flushing).
  await new Promise((r) => setTimeout(r, 10));
  return {
    user: {
      id: params.id,
      name: `Ada-${params.id}`,
      joined: '2026-04-18',
    },
    // Timestamp makes it obvious client-nav re-runs the loader —
    // SSR'd HTML has the server's epoch; a client-side /users/1 → /users/2
    // hop bumps this to the browser's clock.
    loadedAt: new Date().toISOString(),
  };
}

export default function UserDetail() {
  const params = useParams();
  const data = useLoaderData<typeof load>();
  useMeta(() => ({
    title: `${data()?.user.name ?? 'User'} — Mikata Kit SSR Example`,
    description: `Profile page for ${data()?.user.name ?? 'a user'}.`,
    meta: [
      { property: 'og:title', content: data()?.user.name ?? 'User' },
      { property: 'og:type', content: 'profile' },
    ],
  }));
  return (
    <section class="page">
      <h2>User {params().id}</h2>
      <p>
        Hello, <strong>{data()?.user.name ?? '…'}</strong>!
        Joined {data()?.user.joined ?? '…'}.
      </p>
      <p>
        Loader ran at <code>{data()?.loadedAt ?? '…'}</code>.
        Hop between User 1 / 2 / 42 in the nav — the timestamp updates
        because <code>load()</code> re-runs on each client-side navigation.
      </p>
    </section>
  );
}
