import { Link } from '@mikata/router';

export function Nav() {
  return (
    <nav>
      <Link to="/">Home</Link>{' '}
      <Link to="/about">About</Link>{' '}
      <Link to="/users/1">User 1</Link>{' '}
      <Link to="/users/2">User 2</Link>{' '}
      <Link to="/users/42">User 42</Link>{' '}
      <Link to="/boom">Boom</Link>{' '}
      <Link to="/does-not-exist">404</Link>
    </nav>
  );
}
