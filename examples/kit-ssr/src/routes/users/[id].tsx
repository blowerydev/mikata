import { useParams } from '@mikata/router';

export default function UserDetail() {
  const params = useParams();
  return (
    <section class="page">
      <h2>User {params().id}</h2>
      <p>Dynamic segment resolved from the file name `[id].tsx`.</p>
    </section>
  );
}
