import { signal, effect } from '@mikata/reactivity';
import { flattenTheme, type ColorScheme } from '@mikata/ui';

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

// Tracks the system color preference. Updated from a media-query
// listener so the resolved scheme reacts to OS changes while the
// user is on 'auto'. Starts at 'light' - gets corrected on install.
const [systemPrefersDark, setSystemPrefersDark] = signal(false);

function resolveScheme(s: ColorScheme, prefersDark: boolean): 'light' | 'dark' {
  if (s === 'light' || s === 'dark') return s;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Apply @mikata/ui theme tokens as CSS variables on the document root.
 * Running on `<html>` (rather than on ThemeProvider's wrapper div)
 * sidesteps the imperative-wrapper hydration bug: the <html> element
 * exists from the first byte the browser parses, so every CSS variable
 * update is visible immediately across the whole page. Call once from
 * `entry-client.tsx` before `mount(...)`.
 */
export function installThemeVars(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (typeof matchMedia !== 'undefined') {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mq.matches);
    mq.addEventListener?.('change', (e) => setSystemPrefersDark(e.matches));
  }

  effect(() => {
    const resolved = resolveScheme(colorScheme(), systemPrefersDark());
    // `flattenTheme` produces the full semantic token set - not just the
    // base palette (color-primary-0..9) but the derived aliases the
    // component CSS actually references: color-primary-filled,
    // color-primary-filled-hover, color-primary-light, font-weight-medium,
    // radius-sm, etc. Iterating defaultTheme directly leaves those
    // undefined and the styles fall back to invalid values.
    const tokens = flattenTheme({}, resolved);
    for (const [key, value] of Object.entries(tokens)) {
      root.style.setProperty(`--mkt-${key}`, value);
    }
    root.setAttribute('data-mkt-color-scheme', resolved);
  });
}
