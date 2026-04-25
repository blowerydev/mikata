import { renderEffect } from '@mikata/reactivity';
import { createIcon, Sun, Moon, Monitor } from '@mikata/icons';
import { colorSchemeSignal, setColorScheme, type ColorScheme } from '../theme-state';

// CSS-only theme switcher for the docs topbar.
//
// Why not `@mikata/ui`'s `SegmentedControl`: that component positions
// its sliding indicator imperatively (reads `getBoundingClientRect()`
// + `offsetLeft` on the active label, writes inline width / transform
// on a separate indicator div). In Vite dev, the JS bundle can run
// before the docs stylesheet has applied `position: relative` to the
// wrapper, so `offsetLeft` resolves against `<body>` and the pill
// ends up off-screen until the user clicks and forces a re-measure.
// A pure CSS active-state ([data-active] background) renders correctly
// from the very first paint, no measurement, no race.
//
// `<ThemeProvider>` is deliberately NOT used here - it scopes its
// tokens to a wrapper div, but docs chrome (html / body backgrounds)
// needs the tokens on `<html>`. `theme-state.ts` does that via
// `applyThemeToDocument`.
const OPTIONS: Array<{ value: ColorScheme; label: string; icon: () => SVGSVGElement }> = [
  { value: 'light', label: 'Light', icon: () => createIcon(Sun, { size: 14 }) },
  { value: 'auto', label: 'System', icon: () => createIcon(Monitor, { size: 14 }) },
  { value: 'dark', label: 'Dark', icon: () => createIcon(Moon, { size: 14 }) },
];

export function ThemeToggle() {
  const scheme = colorSchemeSignal();
  return (
    <div class="theme-toggle" role="radiogroup" aria-label="Color theme">
      {OPTIONS.map((opt) => {
        const button = (
          <button
            type="button"
            class="theme-toggle__option"
            role="radio"
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setColorScheme(opt.value)}
          >
            {() => opt.icon()}
          </button>
        ) as HTMLButtonElement;
        // `data-active` + `aria-checked` keep CSS and accessibility in
        // sync. Reactive so click-to-change updates the visual state
        // without any DOM measurement or sliding-indicator math.
        renderEffect(() => {
          const active = scheme() === opt.value;
          if (active) button.dataset.active = '';
          else delete button.dataset.active;
          button.setAttribute('aria-checked', active ? 'true' : 'false');
          button.tabIndex = active ? 0 : -1;
        });
        return button;
      })}
    </div>
  );
}
