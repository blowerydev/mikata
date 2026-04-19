import { useMeta } from '@mikata/kit/head';

export default function Home() {
  useMeta({
    title: 'Home — Mikata Kit SSR Example',
    description: 'Server-rendered and hydrated with @mikata/kit.',
    meta: [{ property: 'og:title', content: 'Mikata Kit SSR Example' }],
  });
  return (
    <section class="page">
      <h2>Home</h2>
      <p>This page was rendered on the server and hydrated on the client.</p>
    </section>
  );
}
