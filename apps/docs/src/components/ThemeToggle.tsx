import { each } from '@mikata/runtime';
import { createIcon, Sun, Moon, Monitor } from '@mikata/icons';
import { colorSchemeSignal, setColorScheme } from '../theme-state';
import type { ColorScheme } from '@mikata/ui';

// Icon-only segmented control. The visible glyph is the affordance,
// `aria-label` per button + a parent `aria-label="Theme"` on the
// radiogroup keep screen readers oriented.
//
// Icons come from `@mikata/icons` rather than hardcoded JSX SVG: the
// `createIcon` factory returns a real `SVGSVGElement` via
// `document.createElementNS`, which `_insert` handles uniformly on
// the SSR shim and the client. Lucide / Tabler icon tuples drop in via
// the same factory if a docs page wants something outside the
// built-in set.
const OPTIONS: readonly { value: ColorScheme; label: string; icon: () => SVGSVGElement }[] = [
  { value: 'light', label: 'Light', icon: () => createIcon(Sun, { size: 14 }) },
  { value: 'auto', label: 'System', icon: () => createIcon(Monitor, { size: 14 }) },
  { value: 'dark', label: 'Dark', icon: () => createIcon(Moon, { size: 14 }) },
];

export function ThemeToggle() {
  const scheme = colorSchemeSignal();
  return (
    <div class="theme-toggle" role="radiogroup" aria-label="Theme">
      {each(
        () => OPTIONS,
        (opt) => (
          <button
            type="button"
            role="radio"
            aria-label={opt.label}
            aria-checked={scheme() === opt.value ? 'true' : 'false'}
            data-active={scheme() === opt.value}
            onClick={() => setColorScheme(opt.value)}
          >
            {/* Arrow form so the compiler routes through `_insert` (Node
                path) instead of text-baking the call's return into
                `.data`. A bare `{opt.icon()}` is conservatively
                text-baked because the compiler can't prove a
                member-call returns a primitive. */}
            {() => opt.icon()}
          </button>
        ),
        undefined,
        { key: (o) => o.value },
      )}
    </div>
  );
}
