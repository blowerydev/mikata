import { createIcon, Sun, Moon, Monitor } from '@mikata/icons';
import { SegmentedControl } from '@mikata/ui';
import type { SegmentedControlProps } from '@mikata/ui';
import { colorSchemeSignal, setColorScheme, type ColorScheme } from '../theme-state';

// `<ThemeProvider>` is deliberately not used here: it scopes tokens to a
// wrapper div, but the docs chrome needs tokens on `<html>`. `theme-state.ts`
// handles that with `applyThemeToDocument`.
const OPTIONS: Array<{ value: ColorScheme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'auto', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeToggle() {
  const scheme = colorSchemeSignal();
  const props: SegmentedControlProps = {
    class: 'theme-toggle',
    'aria-label': 'Color theme',
    size: 'xs',
    onChange: (value) => setColorScheme(value as ColorScheme),
    data: OPTIONS.map((opt) => ({
      value: opt.value,
      label: createIcon(opt.icon, { size: 14 }),
      ariaLabel: opt.label,
      title: opt.label,
    })),
  };
  Object.defineProperty(props, 'value', {
    enumerable: true,
    get: scheme,
  });

  return SegmentedControl(props);
}
