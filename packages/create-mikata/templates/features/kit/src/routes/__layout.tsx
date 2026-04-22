import { routeOutlet, Link } from '@mikata/router';

export default function Layout() {
  return (
    <div style={{ padding: '2rem', maxWidth: '48rem', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
        <Link to="/about">About</Link>
      </nav>
      {routeOutlet()}
    </div>
  );
}
