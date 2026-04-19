import { useMeta } from '@mikata/kit/head';

export default function About() {
  useMeta({
    title: 'About — Mikata Kit SSR Example',
    description: 'File-based routing via @mikata/kit.',
  });
  return (
    <section class="page">
      <h2>About</h2>
      <p>File-based routing via @mikata/kit.</p>
    </section>
  );
}
