import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createScope } from '@mikata/reactivity';
import { createTheme, defaultTheme, darkTheme, ThemeProvider, flattenTheme, useComponentDefaults } from '../src/theme';

describe('createTheme', () => {
  it('returns empty structured theme when no overrides', () => {
    const theme = createTheme({});
    expect(theme).toEqual({});
  });

  it('accepts structured fields', () => {
    const theme = createTheme({ primaryColor: 'red', primaryShade: 7 });
    expect(theme.primaryColor).toBe('red');
    expect(theme.primaryShade).toBe(7);
  });

  it('routes flat-shape overrides into `other` for back-compat', () => {
    const theme = createTheme({
      'color-primary-6': '#7c3aed',
      'radius-sm': '0.375rem',
    });
    expect(theme.other).toEqual({
      'color-primary-6': '#7c3aed',
      'radius-sm': '0.375rem',
    });
  });
});

describe('defaultTheme', () => {
  it('has primary color palette (0-9)', () => {
    for (let i = 0; i <= 9; i++) {
      expect(defaultTheme[`color-primary-${i}`]).toBeDefined();
    }
  });

  it('has semantic colors', () => {
    expect(defaultTheme['color-text']).toBeDefined();
    expect(defaultTheme['color-bg']).toBeDefined();
    expect(defaultTheme['color-border']).toBeDefined();
    expect(defaultTheme['color-error']).toBeDefined();
    expect(defaultTheme['color-success']).toBeDefined();
  });

  it('has spacing scale', () => {
    for (let i = 0; i <= 8; i++) {
      expect(defaultTheme[`space-${i}`]).toBeDefined();
    }
  });

  it('has size presets', () => {
    for (const s of ['xs', 'sm', 'md', 'lg', 'xl']) {
      expect(defaultTheme[`size-${s}`]).toBeDefined();
    }
  });

  it('has radius presets', () => {
    for (const r of ['xs', 'sm', 'md', 'lg', 'xl', 'full']) {
      expect(defaultTheme[`radius-${r}`]).toBeDefined();
    }
  });

  it('has z-index layers', () => {
    expect(Number(defaultTheme['z-dropdown'])).toBeLessThan(Number(defaultTheme['z-modal']));
    expect(Number(defaultTheme['z-modal'])).toBeLessThan(Number(defaultTheme['z-toast']));
  });
});

describe('darkTheme', () => {
  it('overrides semantic colors', () => {
    expect(darkTheme['color-text']).toBeDefined();
    expect(darkTheme['color-bg']).toBeDefined();
    expect(darkTheme['color-text']).not.toBe(defaultTheme['color-text']);
    expect(darkTheme['color-bg']).not.toBe(defaultTheme['color-bg']);
  });

  it('has darker shadows', () => {
    expect(darkTheme['shadow-md']).toBeDefined();
    expect(darkTheme['shadow-md']).toContain('0.4');
  });
});

describe('flattenTheme', () => {
  it('emits every base token for light scheme', () => {
    const flat = flattenTheme({}, 'light');
    expect(flat['color-primary-6']).toBe(defaultTheme['color-primary-6']);
    expect(flat['color-text']).toBe(defaultTheme['color-text']);
    expect(flat['color-bg']).toBe(defaultTheme['color-bg']);
  });

  it('overlays dark base tokens for dark scheme', () => {
    const flat = flattenTheme({}, 'dark');
    expect(flat['color-bg']).toBe(darkTheme['color-bg']);
    expect(flat['color-primary-6']).toBe(defaultTheme['color-primary-6']);
  });

  it('emits semantic aliases per palette (light)', () => {
    const flat = flattenTheme({}, 'light');
    expect(flat['color-primary-filled']).toBe('var(--mkt-color-primary-6)');
    expect(flat['color-primary-filled-hover']).toBe('var(--mkt-color-primary-7)');
    expect(flat['color-primary-light']).toBe('var(--mkt-color-primary-0)');
    expect(flat['color-primary-light-hover']).toBe('var(--mkt-color-primary-1)');
    expect(flat['color-primary-border']).toBe('var(--mkt-color-primary-3)');
  });

  it('emits semantic aliases per palette (dark) with color-mix', () => {
    const flat = flattenTheme({}, 'dark');
    expect(flat['color-primary-filled']).toBe('var(--mkt-color-primary-8)');
    expect(flat['color-primary-filled-hover']).toBe('var(--mkt-color-primary-9)');
    expect(flat['color-primary-light']).toBe(
      'color-mix(in srgb, var(--mkt-color-primary-filled) 15%, transparent)'
    );
    expect(flat['color-primary-light-hover']).toBe(
      'color-mix(in srgb, var(--mkt-color-primary-filled) 25%, transparent)'
    );
    expect(flat['color-primary-border']).toBe('var(--mkt-color-primary-4)');
  });

  it('honours explicit primaryShade (number)', () => {
    const flat = flattenTheme({ primaryShade: 5 }, 'light');
    expect(flat['color-primary-filled']).toBe('var(--mkt-color-primary-5)');
    expect(flat['color-primary-filled-hover']).toBe('var(--mkt-color-primary-6)');
  });

  it('honours per-scheme primaryShade', () => {
    const light = flattenTheme({ primaryShade: { light: 7, dark: 9 } }, 'light');
    const dark = flattenTheme({ primaryShade: { light: 7, dark: 9 } }, 'dark');
    expect(light['color-primary-filled']).toBe('var(--mkt-color-primary-7)');
    expect(dark['color-primary-filled']).toBe('var(--mkt-color-primary-9)');
  });

  it('clamps filled-hover shade at 9', () => {
    const flat = flattenTheme({ primaryShade: 9 }, 'light');
    expect(flat['color-primary-filled-hover']).toBe('var(--mkt-color-primary-9)');
  });

  it('emits custom palette shades', () => {
    const brand = [
      '#f0e7ff', '#dccaff', '#c1a6ff', '#a682ff', '#8b5eff',
      '#7043ff', '#5929f0', '#4921cf', '#3b1ba8', '#2d1480',
    ] as const;
    const flat = flattenTheme({ colors: { brand } }, 'light');
    for (let i = 0; i < 10; i++) expect(flat[`color-brand-${i}`]).toBe(brand[i]);
    expect(flat['color-brand-filled']).toBe('var(--mkt-color-brand-6)');
    expect(flat['color-brand-light']).toBe('var(--mkt-color-brand-0)');
  });

  it('aliases primary-* to chosen primaryColor', () => {
    const brand = Array(10).fill('#000') as unknown as readonly [string, string, string, string, string, string, string, string, string, string];
    const flat = flattenTheme({ colors: { brand }, primaryColor: 'brand' }, 'light');
    expect(flat['color-primary-6']).toBe('var(--mkt-color-brand-6)');
    expect(flat['color-primary-0']).toBe('var(--mkt-color-brand-0)');
    expect(flat['color-primary-filled']).toBe('var(--mkt-color-brand-filled)');
    expect(flat['color-primary-light']).toBe('var(--mkt-color-brand-light)');
    expect(flat['color-primary-border']).toBe('var(--mkt-color-brand-border)');
  });

  it('throws when primaryColor references unknown palette', () => {
    expect(() => flattenTheme({ primaryColor: 'nope' }, 'light')).toThrow(/primaryColor/);
  });

  it('resolves defaultRadius size keywords', () => {
    expect(flattenTheme({ defaultRadius: 'md' }, 'light')['radius-default']).toBe('var(--mkt-radius-md)');
    expect(flattenTheme({ defaultRadius: 'full' }, 'light')['radius-default']).toBe('var(--mkt-radius-full)');
  });

  it('passes raw defaultRadius values through', () => {
    expect(flattenTheme({ defaultRadius: '0.375rem' }, 'light')['radius-default']).toBe('0.375rem');
  });

  it('applies heading sizing with defaults and overrides', () => {
    const flat = flattenTheme({ headings: { fontWeight: '600', h1: { size: '3rem' } } }, 'light');
    expect(flat['h1-size']).toBe('3rem');
    expect(flat['h1-weight']).toBe('600');
    expect(flat['h1-lh']).toBe('1.3');
    expect(flat['h3-size']).toBe('1.375rem');
    expect(flat['h3-weight']).toBe('600');
  });

  it('applies fontFamily overrides', () => {
    const flat = flattenTheme({ fontFamily: 'Inter', fontFamilyMono: 'JetBrains Mono' }, 'light');
    expect(flat['font-family']).toBe('Inter');
    expect(flat['font-family-mono']).toBe('JetBrains Mono');
  });

  it('cssVariablesResolver merges variables and scheme-specific overrides', () => {
    const flat = flattenTheme({
      cssVariablesResolver: () => ({
        variables: { 'custom-x': '42px' },
        light: { 'color-bg': '#fff' },
        dark: { 'color-bg': '#000' },
      }),
    }, 'dark');
    expect(flat['custom-x']).toBe('42px');
    expect(flat['color-bg']).toBe('#000');
  });

  it('`other` overrides take highest precedence', () => {
    const flat = flattenTheme({ other: { 'color-primary-6': '#ff0000' } }, 'light');
    expect(flat['color-primary-6']).toBe('#ff0000');
  });
});

describe('ThemeProvider', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders a div with data-mkt-theme attribute', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({}) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.hasAttribute('data-mkt-theme')).toBe(true);
  });

  it('uses display:contents to avoid layout impact', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({}) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.style.display).toBe('contents');
  });

  it('sets CSS variables from default theme', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({}) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.style.getPropertyValue('--mkt-color-primary-6')).toBe(defaultTheme['color-primary-6']);
    expect(el.style.getPropertyValue('--mkt-color-text')).toBe(defaultTheme['color-text']);
  });

  it('sets CSS variables from custom theme (back-compat flat shape)', () => {
    const custom = createTheme({ 'color-primary-6': '#ff0000' });
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({ theme: custom }) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.style.getPropertyValue('--mkt-color-primary-6')).toBe('#ff0000');
  });

  it('emits semantic aliases on wrapper', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({}) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.style.getPropertyValue('--mkt-color-primary-filled')).toBe('var(--mkt-color-primary-6)');
    expect(el.style.getPropertyValue('--mkt-color-red-light')).toBe('var(--mkt-color-red-0)');
  });

  it('defaults to light color scheme', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({}) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.getAttribute('data-mkt-color-scheme')).toBe('light');
  });

  it('applies dark theme overrides when colorScheme is dark', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({ colorScheme: 'dark' }) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.getAttribute('data-mkt-color-scheme')).toBe('dark');
    expect(el.style.getPropertyValue('--mkt-color-bg')).toBe(darkTheme['color-bg']);
  });

  it('provides empty defaults when theme.components is unset', () => {
    let captured: Record<string, unknown> | undefined;
    createScope(() => {
      const el = ThemeProvider({}) as HTMLElement;
      container.appendChild(el);
      captured = useComponentDefaults<{ variant: string }>('Button');
    });
    expect(captured).toEqual({});
  });

  it('exposes theme.components via useComponentDefaults', () => {
    let captured: Record<string, unknown> | undefined;
    createScope(() => {
      const el = ThemeProvider({
        theme: { components: { Button: { variant: 'light', size: 'lg' } } },
      }) as HTMLElement;
      container.appendChild(el);
      captured = useComponentDefaults('Button');
    });
    expect(captured).toEqual({ variant: 'light', size: 'lg' });
  });

  it('emits custom-palette CSS rules for registered components', () => {
    const brand = Array(10).fill('#000') as unknown as readonly [
      string, string, string, string, string,
      string, string, string, string, string,
    ];
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({ theme: { colors: { brand } } }) as HTMLElement;
      container.appendChild(el);
    });
    const style = el.querySelector('style[data-mkt-generated]') as HTMLStyleElement;
    expect(style).toBeTruthy();
    expect(style.textContent).toContain('.mkt-button[data-color="brand"]');
    expect(style.textContent).toContain('--_btn-color: var(--mkt-color-brand-filled)');
    expect(style.textContent).toContain('.mkt-text[data-color="brand"]');
  });

  it('emits no custom rules when there are no custom palettes', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({}) as HTMLElement;
      container.appendChild(el);
    });
    const style = el.querySelector('style[data-mkt-generated]') as HTMLStyleElement;
    expect(style.textContent).toBe('');
  });

  it('deprecated darkTheme prop still overrides in dark scheme', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({ colorScheme: 'dark', darkTheme: { 'color-bg': '#0a0a0a' } }) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.style.getPropertyValue('--mkt-color-bg')).toBe('#0a0a0a');
  });
});
