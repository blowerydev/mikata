import { useMeta } from '@mikata/kit/head';

export default function Home() {
  useMeta({
    title: 'Home — Mikata Kit',
    description: 'Server-rendered and hydrated with @mikata/kit.',
  });
  return (
    <section>
      <h1>Hello, Mikata Kit!</h1>
      <p>This page was rendered on the server and hydrated on the client.</p>
      <p>Edit <code>src/routes/index.tsx</code> and save to reload.</p>
    </section>
  );
}
