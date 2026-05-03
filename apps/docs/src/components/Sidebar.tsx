import { Link } from '@mikata/router';
import { each, onCleanup, onMount } from '@mikata/runtime';
import { nav as navEntries } from 'virtual:mikata-nav';
import { sections } from '../sections';

const SIDEBAR_SCROLL_KEY = 'mikata:docs-sidebar-scroll';
let lastSidebarScrollTop = 0;

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

function readSidebarScroll(): number {
  try {
    const raw = globalThis.sessionStorage?.getItem(SIDEBAR_SCROLL_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : lastSidebarScrollTop;
  } catch {
    return lastSidebarScrollTop;
  }
}

function writeSidebarScroll(value: number): void {
  lastSidebarScrollTop = value;
  try {
    globalThis.sessionStorage?.setItem(SIDEBAR_SCROLL_KEY, String(value));
  } catch {
    // Keep the in-memory fallback when storage is unavailable.
  }
}

export function Sidebar() {
  let aside: HTMLElement | null = null;
  let pendingScrollTop = 0;
  let restoringScroll = false;

  const setAside = (el: HTMLElement): void => {
    aside = el;
    pendingScrollTop = readSidebarScroll();
    restoringScroll = pendingScrollTop > 0;
    // Ref callbacks run during DOM creation, before the browser gets a
    // chance to paint a remounted sidebar at scrollTop=0.
    if (restoringScroll) aside.scrollTop = pendingScrollTop;
  };

  const saveScroll = (): void => {
    if (restoringScroll) return;
    if (aside) writeSidebarScroll(aside.scrollTop);
  };

  onMount(() => {
    if (!aside) return;
    aside.scrollTop = pendingScrollTop;
    restoringScroll = false;
  });

  onCleanup(() => {
    saveScroll();
  });

  return (
    <aside ref={setAside} class="docs-sidebar" onScroll={saveScroll}>
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
                    <Link
                      to={page.path}
                      onMouseDown={(event: MouseEvent) => {
                        if (event.button === 0) event.preventDefault();
                      }}
                    >
                      {page.title}
                    </Link>
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
