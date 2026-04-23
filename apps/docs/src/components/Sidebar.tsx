import { Link } from '@mikata/router';
import { sections } from '../docs.config';

/**
 * Sidebar navigation. The two levels of iteration are rendered via
 * function-child accessors (`{() => arr.map(...)}`) rather than
 * `each()`, because `each()` is not hydration-aware in the current
 * runtime: its items end up in a disconnected DocumentFragment on the
 * client, leaving the SSR-rendered links without click handlers.
 * Function accessors go through the normal reactive `_insert` path,
 * which adopts the server-rendered nodes during hydration and attaches
 * handlers in place.
 */
export function Sidebar() {
  return (
    <aside class="docs-sidebar">
      {() =>
        sections.map((section) => (
          <div class="docs-sidebar-section">
            <h3>{section.title}</h3>
            <ul>
              {() =>
                section.pages.map((page) => (
                  <li>
                    <Link to={page.href}>{page.title}</Link>
                  </li>
                ))
              }
            </ul>
          </div>
        ))
      }
    </aside>
  );
}
