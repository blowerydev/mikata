import { useParams } from '@mikata/router';
import { Nav } from '../../components/Nav';

export default function UserDetail() {
  const params = useParams();
  return (
    <div>
      <h1>Mikata Kit SSR</h1>
      <Nav />
      <section class="page">
        <h2>User {params().id}</h2>
        <p>Dynamic segment resolved from the file name `[id].tsx`.</p>
      </section>
    </div>
  );
}
