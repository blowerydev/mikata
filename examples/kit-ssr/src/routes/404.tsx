import { Link } from '@mikata/router';
import { useMeta } from '@mikata/kit/head';

export default function NotFound() {
  useMeta({
    title: 'Not found — Mikata Kit SSR Example',
    description: 'No route matched this URL.',
  });
  return (
    <section class="page">
      <h2>404 — Not found</h2>
      <p>That URL doesn't match any route.</p>
      <p>
        <Link to="/">Go home</Link>
      </p>
    </section>
  );
}
