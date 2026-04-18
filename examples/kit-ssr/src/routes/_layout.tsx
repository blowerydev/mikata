import { routeOutlet } from '@mikata/router';
import { Nav } from '../components/Nav';

export default function Layout() {
  return (
    <div>
      <h1>Mikata Kit SSR</h1>
      <Nav />
      {routeOutlet()}
      <footer>layout footer</footer>
    </div>
  );
}
