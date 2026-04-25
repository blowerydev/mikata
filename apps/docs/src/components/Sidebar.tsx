import { Link } from '@mikata/router';
import { each } from '@mikata/runtime';
import { nav as navEntries } from 'virtual:mikata-nav';
import { sections } from '../sections';

// Group flat nav entries by section + within-section order. Runs once
// at module load - the entries array is build-time-stable, no need to
// rebuild on every render.
const grouped = sections.map((title) => ({
  title,
  pages: navEntries
    .filter((e) => e.section === title)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
}));

export function Sidebar() {
  return (
    <aside class="docs-sidebar">
      {each(
        () => grouped,
        (section) => (
          <div class="docs-sidebar-section">
            <h3>{section.title}</h3>
            <ul>
              {each(
                () => section.pages,
                (page) => (
                  <li>
                    <Link to={page.path}>{page.title}</Link>
                  </li>
                ),
                undefined,
                { key: (p) => p.path },
              )}
            </ul>
          </div>
        ),
        undefined,
        { key: (s) => s.title },
      )}
    </aside>
  );
}
