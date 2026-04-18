import { Nav } from '../components/Nav';

export default function About() {
  return (
    <div>
      <h1>Mikata Kit SSR</h1>
      <Nav />
      <section class="page">
        <h2>About</h2>
        <p>
          File-based routing via <code>@mikata/kit</code>: this page lives at
          <code>src/routes/about.tsx</code> and is served by a dev-mode SSR
          middleware that imports <code>virtual:mikata-routes</code>.
        </p>
      </section>
    </div>
  );
}
