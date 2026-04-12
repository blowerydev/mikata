import type { MikataSize } from '../types';
import type { ColorPalette } from './palettes';

export type ColorScheme = 'light' | 'dark' | 'auto';

export interface HeadingConfig {
  size?: string;
  weight?: string;
  lineHeight?: string;
}

export interface HeadingsConfig {
  fontFamily?: string;
  fontWeight?: string;
  h1?: HeadingConfig;
  h2?: HeadingConfig;
  h3?: HeadingConfig;
  h4?: HeadingConfig;
  h5?: HeadingConfig;
  h6?: HeadingConfig;
}

export interface CSSVariablesOutput {
  variables?: Record<string, string>;
  light?: Record<string, string>;
  dark?: Record<string, string>;
}

export interface CSSVariablesResolverContext {
  theme: MikataTheme;
  colorScheme: 'light' | 'dark';
}

export type CSSVariablesResolver = (ctx: CSSVariablesResolverContext) => CSSVariablesOutput;

export type PrimaryShade = number | { light: number; dark: number };

export interface MikataTheme {
  /** Additional palettes merged over the built-in 11. Each palette must have exactly 10 shades. */
  colors?: Record<string, ColorPalette>;
  /** Which palette name is "primary". Default: 'primary'. */
  primaryColor?: string;
  /** Canonical filled shade index (0-9). Default: { light: 6, dark: 8 }. */
  primaryShade?: PrimaryShade;
  /** Default border radius for user-facing interactive components. Default: 'sm'. */
  defaultRadius?: MikataSize | string;
  fontFamily?: string;
  fontFamilyMono?: string;
  headings?: HeadingsConfig;
  /** Per-component default props. Example: { Button: { variant: 'light' } } */
  components?: Record<string, Record<string, unknown>>;
  /** Hook for injecting arbitrary extra CSS variables. */
  cssVariablesResolver?: CSSVariablesResolver;
  /** Arbitrary user-defined scalar token overrides, e.g. { 'radius-sm': '0.375rem' }. */
  other?: Record<string, string>;
}

export interface ThemeProviderProps {
  /**
   * Theme object or a getter for one. Pass a getter (`() => theme`) if you
   * need the provider to react to signal-driven token changes — CSS variables
   * and palette rules update live. `theme.components` defaults are read once
   * at mount.
   */
  theme?: MikataTheme | (() => MikataTheme);
  /** @deprecated Use `theme.other` for dark-scheme overrides; dark semantic colors are now built in. */
  darkTheme?: Record<string, string>;
  colorScheme?: ColorScheme;
  children?: Node;
}

export interface ThemeContextValue {
  colorScheme: () => ColorScheme;
  resolvedColorScheme: () => 'light' | 'dark';
  setColorScheme: (scheme: ColorScheme) => void;
  theme: () => MikataTheme;
}
