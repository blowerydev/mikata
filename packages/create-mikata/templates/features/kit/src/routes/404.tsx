import { Link } from '@mikata/router';
import { useMeta } from '@mikata/kit/head';

export default function NotFound() {
  useMeta({ title: 'Not found — Mikata Kit' });
  return (
    <section>
      <h1>404 — Not found</h1>
      <p>That URL doesn't match any route.</p>
      <p><Link to="/">Go home</Link></p>
    </section>
  );
}
