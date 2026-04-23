import { Link, routeOutlet } from '@mikata/router';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Layout() {
  return (
    <div class="docs-shell">
      <header class="docs-topbar">
        <Link to="/" class="brand">
          Mikata
        </Link>
        <div class="topbar-links">
          <ThemeToggle />
          <a
            href="https://github.com/blowerydev/mikata"
            target="_blank"
            rel="noreferrer"
            class="topbar-link"
          >
            GitHub
          </a>
        </div>
      </header>
      <Sidebar />
      <main class="docs-content">
        {routeOutlet()}
        {/* sibling text forces the compiler to use _insert instead of .data */}
        {''}
      </main>
    </div>
  );
}
