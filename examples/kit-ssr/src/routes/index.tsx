import { Nav } from '../components/Nav';

export default function Home() {
  return (
    <div>
      <h1>Mikata Kit SSR</h1>
      <Nav />
      <section class="page">
        <h2>Home</h2>
        <p>This page was rendered on the server and hydrated on the client.</p>
        <p>
          Navigate between the pages above — each request is SSR'd on the
          dev server and upgraded to client routing after hydrate.
        </p>
      </section>
    </div>
  );
}
