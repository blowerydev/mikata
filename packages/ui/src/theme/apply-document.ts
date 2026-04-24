import { effect } from '@mikata/reactivity';
import { flattenTheme } from './flatten';
import type { MikataTheme, ColorScheme } from './types';

/**
 * Write theme tokens to the `<html>` element so CSS variables cascade
 * to the entire document (including `html` and `body` backgrounds),
 * not just to descendants of a `ThemeProvider` wrapper.
 *
 * This is the pattern you want for whole-page SSR/SSG apps where the
 * chrome (`html`, `body`) needs to react to theme changes. `ThemeProvider`
 * is still the right choice for scoped theming inside an app - for
 * example, a single section that overrides the palette.
 *
 * The helper is reactive: pass signal-returning options and the vars
 * update as the signals change. Pass plain values for one-shot setup.
 *
 * Usage:
 *   import { applyThemeToDocument } from '@mikata/ui';
 *
 *   // Static (one-shot):
 *   applyThemeToDocument({ scheme: 'dark' });
 *
 *   // Reactive (reads a signal):
 *   const [scheme, setScheme] = signal<ColorScheme>('auto');
 *   applyThemeToDocument({ scheme, systemPrefersDark });
 *
 * Call once at app bootstrap (before `mount()` / `hydrate()`). The
 * inline style set on `<html>` survives hydration unchanged, so the
 * first paint already has resolved values.
 */
export interface ApplyThemeToDocumentOptions {
  /** `ColorScheme` or a getter returning one. Defaults to `'light'`. */
  scheme?: ColorScheme | (() => ColorScheme);
  /** Theme overrides or a getter. Passed through `flattenTheme`. */
  theme?: MikataTheme | (() => MikataTheme);
  /**
   * Whether the OS prefers dark, for resolving `'auto'`. Accepts a
   * bare boolean or a signal-like getter. Defaults to reading
   * `matchMedia('(prefers-color-scheme: dark)')` at call time (no
   * reactive updates from the OS unless you pass a signal).
   */
  systemPrefersDark?: boolean | (() => boolean);
}

function resolve<T>(v: T | (() => T)): T {
  return typeof v === 'function' ? (v as () => T)() : v;
}

function resolveScheme(raw: ColorScheme, prefersDark: boolean): 'light' | 'dark' {
  if (raw === 'light' || raw === 'dark') return raw;
  return prefersDark ? 'dark' : 'light';
}

export function applyThemeToDocument(options: ApplyThemeToDocumentOptions = {}): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const prefersDarkDefault =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;

  effect(() => {
    const scheme = resolve(options.scheme ?? 'light');
    const theme = resolve(options.theme ?? ({} as MikataTheme));
    const prefersDark =
      options.systemPrefersDark === undefined
        ? prefersDarkDefault
        : resolve(options.systemPrefersDark);

    const resolved = resolveScheme(scheme, prefersDark);
    const tokens = flattenTheme(theme, resolved);
    for (const [key, value] of Object.entries(tokens)) {
      root.style.setProperty(`--mkt-${key}`, value);
    }
    root.setAttribute('data-mkt-color-scheme', resolved);
  });
}
