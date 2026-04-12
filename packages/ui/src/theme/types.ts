export type MikataTheme = Record<string, string>;

export type ColorScheme = 'light' | 'dark' | 'auto';

export interface ThemeProviderProps {
  theme?: MikataTheme;
  darkTheme?: MikataTheme;
  colorScheme?: ColorScheme;
  children?: Node;
}

export interface ThemeContextValue {
  colorScheme: () => ColorScheme;
  resolvedColorScheme: () => 'light' | 'dark';
  setColorScheme: (scheme: ColorScheme) => void;
}
