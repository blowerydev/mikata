import { SegmentedControl, type ColorScheme } from '@mikata/ui';
import { createIcon, Sun, Moon, Monitor } from '@mikata/icons';
import { colorSchemeSignal, setColorScheme } from '../theme-state';

// Icon-only segmented control for the docs topbar. Backed by
// `@mikata/ui`'s `SegmentedControl` - radio-group semantics + the
// sliding indicator come from the library; we just supply the icons,
// the data values, and the change handler.
//
// `label` accepts `Node`, so each item passes the `createIcon(...)`
// SVG directly with an `mkt-visually-hidden` text twin so the
// segmented-control radio still has an accessible name.
//
// `<ThemeProvider>` is deliberately NOT used here - it scopes its
// tokens to a wrapper div, but docs chrome (html / body backgrounds)
// needs the tokens on `<html>`. `theme-state.ts` does that via
// `applyThemeToDocument`.
export function ThemeToggle() {
  const scheme = colorSchemeSignal();
  return SegmentedControl({
    size: 'xs',
    // Items built per-call (not at module top level) so the icon SVG
    // factories run against whichever `document` is live - SSR shim
    // on the server, real DOM on the client.
    data: [
      { value: 'light', label: iconLabel(createIcon(Sun, { size: 14 }), 'Light') },
      { value: 'auto', label: iconLabel(createIcon(Monitor, { size: 14 }), 'System') },
      { value: 'dark', label: iconLabel(createIcon(Moon, { size: 14 }), 'Dark') },
    ],
    value: scheme(),
    onChange: (next) => setColorScheme(next as ColorScheme),
  });
}

function iconLabel(svg: SVGSVGElement, ariaLabel: string): HTMLSpanElement {
  const wrap = document.createElement('span');
  wrap.style.display = 'inline-flex';
  wrap.appendChild(svg);
  const sr = document.createElement('span');
  sr.className = 'mkt-visually-hidden';
  sr.textContent = ariaLabel;
  wrap.appendChild(sr);
  return wrap;
}
