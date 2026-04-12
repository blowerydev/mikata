import { signal, computed, renderEffect } from '@mikata/reactivity';
import { createContext, provide, inject } from '@mikata/runtime';
import type { MikataTheme, ColorScheme, ThemeProviderProps, ThemeContextValue } from './types';
import { defaultTheme } from './tokens';
import { darkTheme as defaultDarkTheme } from './dark';

declare const __DEV__: boolean;

const ThemeContext = createContext<ThemeContextValue>();

/**
 * Create a custom theme by merging overrides with the default theme.
 */
export function createTheme(overrides: Partial<MikataTheme>): MikataTheme {
  return { ...defaultTheme, ...overrides } as MikataTheme;
}

/**
 * Provide theming to descendant components.
 * Sets CSS variables on a wrapper element for native cascade.
 *
 * Usage:
 *   <ThemeProvider colorScheme="auto">
 *     <App />
 *   </ThemeProvider>
 */
export function ThemeProvider(props: ThemeProviderProps): Node {
  const [colorScheme, setColorScheme] = signal<ColorScheme>(props.colorScheme ?? 'light');

  const resolvedColorScheme = computed((): 'light' | 'dark' => {
    const scheme = colorScheme();
    if (scheme !== 'auto') return scheme;
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const activeTheme = computed(() => {
    const base = props.theme ?? defaultTheme;
    const dark = props.darkTheme ?? defaultDarkTheme;
    return resolvedColorScheme() === 'dark' ? { ...base, ...dark } : base;
  });

  provide(ThemeContext, {
    colorScheme,
    resolvedColorScheme,
    setColorScheme,
  });

  const el = document.createElement('div');
  el.setAttribute('data-mkt-theme', '');
  el.style.display = 'contents';

  renderEffect(() => {
    const theme = activeTheme();
    for (const [token, value] of Object.entries(theme)) {
      el.style.setProperty(`--mkt-${token}`, value);
    }
    el.setAttribute('data-mkt-color-scheme', resolvedColorScheme());
  });

  return el;
}

/**
 * Access the current theme context.
 */
export function useTheme(): ThemeContextValue {
  return inject(ThemeContext);
}

export { defaultTheme } from './tokens';
export { darkTheme } from './dark';
export type { MikataTheme, ColorScheme, ThemeProviderProps, ThemeContextValue } from './types';
