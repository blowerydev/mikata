import { signal } from '@mikata/reactivity';
import { applyThemeToDocument, type ColorScheme } from '@mikata/ui';

const STORAGE_KEY = 'mikata-docs-theme';

function readStored(): ColorScheme {
  if (typeof window === 'undefined') return 'auto';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

const [colorScheme, setColorSchemeInternal] = signal<ColorScheme>(readStored());

export function colorSchemeSignal(): () => ColorScheme {
  return colorScheme;
}

export function setColorScheme(next: ColorScheme): void {
  setColorSchemeInternal(next);
  if (typeof window === 'undefined') return;
  try {
    if (next === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode / storage blocked */
  }
}

const [systemPrefersDark, setSystemPrefersDark] = signal(false);

/**
 * Write theme tokens onto `<html>` so `html` and `body` backgrounds
 * react to the theme (ThemeProvider scopes its vars to a wrapper div
 * — the right pattern for sectioned app chrome, wrong pattern for
 * whole-page docs chrome). `applyThemeToDocument` wraps an `effect`
 * so the tokens refresh as the signals flip. Call once from
 * `entry-client.tsx` before `mount(...)`.
 */
export function installThemeVars(): void {
  if (typeof document === 'undefined') return;

  if (typeof matchMedia !== 'undefined') {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mq.matches);
    mq.addEventListener?.('change', (e) => setSystemPrefersDark(e.matches));
  }

  applyThemeToDocument({
    scheme: colorScheme,
    systemPrefersDark,
  });
}
