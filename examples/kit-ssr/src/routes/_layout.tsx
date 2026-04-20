import { routeOutlet } from '@mikata/router';
import { useLoaderData, type LoadContext } from '@mikata/kit/loader';
import { Nav } from '../components/Nav';
import { session } from '../session';

export async function load({ cookies }: LoadContext) {
  return { user: session.read(cookies) };
}

export default function Layout() {
  const data = useLoaderData<typeof load>();
  return (
    <div>
      <h1>Mikata Kit SSR</h1>
      <p class="auth">
        {data()?.user
          ? `Hello, ${data()!.user!.name}!`
          : 'Not logged in.'}
      </p>
      <Nav />
      {routeOutlet()}
      <footer>layout footer</footer>
    </div>
  );
}
