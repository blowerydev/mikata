import { signal, computed, renderEffect } from '@mikata/reactivity';
import { createContext, provide, inject } from '@mikata/runtime';
import type { MikataTheme, ColorScheme, Direction, ThemeProviderProps, ThemeContextValue } from './types';
import { flattenTheme } from './flatten';
import { provideComponentDefaults } from './component-defaults';
import { emitColoredRules } from './colored-registry';
import './registrations';

const ThemeContext = createContext<ThemeContextValue>();

const STRUCTURED_KEYS = new Set([
  'colors', 'primaryColor', 'primaryShade', 'defaultRadius',
  'fontFamily', 'fontFamilyMono', 'headings', 'direction', 'components',
  'cssVariablesResolver', 'other',
]);

/**
 * Create a custom theme.
 *
 * Accepts the structured `MikataTheme` shape, or a flat `{ 'token-name': value }`
 * record for back-compat — flat keys are routed into `theme.other` so they still
 * override base tokens at the same precedence.
 */
export function createTheme(
  overrides: Partial<MikataTheme> | Record<string, string> = {},
): MikataTheme {
  const out: MikataTheme = {};
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (STRUCTURED_KEYS.has(k)) (out as Record<string, unknown>)[k] = v;
    else flat[k] = v as string;
  }
  if (Object.keys(flat).length > 0) out.other = { ...(out.other ?? {}), ...flat };
  return out;
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

  const activeTheme = computed<MikataTheme>(() => {
    const t = props.theme;
    return ((typeof t === 'function' ? t() : t) ?? {}) as MikataTheme;
  });

  const initialDirection: Direction =
    props.direction ??
    (typeof props.theme === 'function' ? props.theme().direction : props.theme?.direction) ??
    'ltr';
  const [direction, setDirection] = signal<Direction>(initialDirection);

  provide(ThemeContext, {
    colorScheme,
    resolvedColorScheme,
    setColorScheme,
    direction,
    setDirection,
    theme: activeTheme,
  });

  const initialTheme = typeof props.theme === 'function' ? props.theme() : props.theme;
  provideComponentDefaults(initialTheme?.components);

  const el = document.createElement('div');
  el.setAttribute('data-mkt-theme', '');
  el.style.display = 'contents';

  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-mkt-generated', '');
  el.appendChild(styleEl);

  renderEffect(() => {
    const scheme = resolvedColorScheme();
    const theme = activeTheme();
    const flat = flattenTheme(theme, scheme);
    if (scheme === 'dark' && props.darkTheme) Object.assign(flat, props.darkTheme);
    for (const [token, value] of Object.entries(flat)) {
      el.style.setProperty(`--mkt-${token}`, value);
    }
    el.setAttribute('data-mkt-color-scheme', scheme);

    const customPalettes = Object.keys(theme.colors ?? {});
    styleEl.textContent = emitColoredRules(customPalettes);
  });

  renderEffect(() => {
    el.setAttribute('dir', direction());
  });

  return el;
}

/**
 * Access the current theme context.
 */
export function useTheme(): ThemeContextValue {
  return inject(ThemeContext);
}

/**
 * Reactive direction signal ('ltr' | 'rtl'). Thin wrapper over `useTheme().direction`.
 * Returns a getter so consumers subscribe only when they read. Defaults to 'ltr'
 * when used outside a `ThemeProvider` so components stay usable standalone.
 */
export function useDirection(): () => Direction {
  try {
    return useTheme().direction;
  } catch {
    return () => 'ltr';
  }
}

export { defaultTheme } from './tokens';
export { darkTheme } from './dark';
export { flattenTheme } from './flatten';
export { useComponentDefaults } from './component-defaults';
export { registerColored, getColoredRegistry } from './colored-registry';
export type { ColoredRule, ColorVarAlias, ColoredDeclValue } from './colored-registry';
export { BUILT_IN_COLORS } from './palettes';
export type { ColorPalette, BuiltInColorName } from './palettes';
export type {
  MikataTheme,
  ColorScheme,
  Direction,
  ThemeProviderProps,
  ThemeContextValue,
  HeadingConfig,
  HeadingsConfig,
  CSSVariablesOutput,
  CSSVariablesResolver,
  CSSVariablesResolverContext,
  PrimaryShade,
} from './types';
