import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';

export default function NotFound() {
  useMeta({ title: 'Not found - Mikata docs' });
  return (
    <section>
      <h1>404</h1>
      <p>That page doesn't exist.</p>
      <p>
        <Link to="/">Home</Link>
      </p>
    </section>
  );
}
