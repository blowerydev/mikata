import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';

export default function Home() {
  useMeta({
    title: 'Mikata - signals + no-VDOM UI framework',
    description:
      'Mikata is a UI framework built on signals, compile-time JSX, and zero virtual DOM.',
  });
  return (
    <section>
      <h1>Mikata</h1>
      <p>
        A UI framework built on signals, compile-time JSX, and zero virtual DOM.
        Ergonomic by default, fast by construction.
      </p>
      <p>
        <Link to="/start/introduction">Get started →</Link>
      </p>
      <h2>What's inside</h2>
      <ul>
        <li>
          <strong>Signals + effects</strong> with no component re-renders -
          updates target exact DOM nodes.
        </li>
        <li>
          <strong>JSX → DOM at build time</strong>, not runtime. No VDOM,
          no reconciler.
        </li>
        <li>
          <strong>@mikata/kit</strong> - file-based routing, SSR, SSG,
          adapters for Node and edge.
        </li>
        <li>
          <strong>@mikata/ui</strong> - 80+ accessible components with live
          playgrounds on the docs pages.
        </li>
      </ul>
    </section>
  );
}
