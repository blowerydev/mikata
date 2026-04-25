import { Link, routeOutlet } from '@mikata/router';
import { createIcon, Github } from '@mikata/icons';
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
            class="topbar-link topbar-link-icon"
            aria-label="GitHub repository"
            title="GitHub repository"
          >
            {createIcon(Github, { size: 18 })}
          </a>
        </div>
      </header>
      <Sidebar />
      <main class="docs-content">{routeOutlet()}</main>
    </div>
  );
}
