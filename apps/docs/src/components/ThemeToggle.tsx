import { each } from '@mikata/runtime';
import { colorSchemeSignal, setColorScheme } from '../theme-state';
import type { ColorScheme } from '@mikata/ui';

const OPTIONS: readonly { value: ColorScheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'auto', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
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
            aria-checked={scheme() === opt.value ? 'true' : 'false'}
            data-active={scheme() === opt.value}
            onClick={() => setColorScheme(opt.value)}
          >
            {opt.label}
          </button>
        ),
        undefined,
        { key: (o) => o.value },
      )}
    </div>
  );
}
