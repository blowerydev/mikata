import { useLoaderData, type LoadContext } from '@mikata/kit/loader';
import { useMeta } from '@mikata/kit/head';

export async function load(_ctx: LoadContext) {
  return { now: new Date().toISOString() };
}

export default function About() {
  const data = useLoaderData<typeof load>();
  useMeta({
    title: 'About — Mikata Kit',
    description: 'File-based routing via @mikata/kit.',
  });
  return (
    <section>
      <h1>About</h1>
      <p>This page uses a <code>load()</code> function that runs on the server before render.</p>
      <p>Rendered at: <time>{data()?.now}</time></p>
    </section>
  );
}
