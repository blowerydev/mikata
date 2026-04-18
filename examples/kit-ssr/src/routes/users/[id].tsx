import { useParams } from '@mikata/router';
import { useLoaderData, type LoadContext } from '@mikata/kit/loader';

// Runs on the server before the route renders. The returned value is
// embedded into the page shell and replayed on the client so the first
// paint is already populated.
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
  };
}

export default function UserDetail() {
  const params = useParams();
  const data = useLoaderData<typeof load>();
  return (
    <section class="page">
      <h2>User {params().id}</h2>
      <p>
        Hello, <strong>{data()?.user.name ?? '…'}</strong>!
        Joined {data()?.user.joined ?? '…'}.
      </p>
      <p>Data came from a server loader; SSR HTML already had this text.</p>
    </section>
  );
}
