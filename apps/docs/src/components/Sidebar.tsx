import { Link } from '@mikata/router';
import { each } from '@mikata/runtime';
import { sections } from '../docs.config';

export function Sidebar() {
  return (
    <aside class="docs-sidebar">
      {each(
        () => sections,
        (section) => (
          <div class="docs-sidebar-section">
            <h3>{section.title}</h3>
            <ul>
              {each(
                () => section.pages,
                (page) => (
                  <li>
                    <Link to={page.href}>{page.title}</Link>
                  </li>
                ),
                undefined,
                { key: (p) => p.href },
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
