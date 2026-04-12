import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createScope, onCleanup } from '@mikata/reactivity';
import { createTheme, defaultTheme, darkTheme, ThemeProvider } from '../src/theme';

describe('createTheme', () => {
  it('returns default theme when no overrides', () => {
    const theme = createTheme({});
    expect(theme).toEqual(defaultTheme);
  });

  it('merges overrides with defaults', () => {
    const theme = createTheme({
      'color-primary-6': '#7c3aed',
      'radius-sm': '0.375rem',
    });
    expect(theme['color-primary-6']).toBe('#7c3aed');
    expect(theme['radius-sm']).toBe('0.375rem');
    // unaffected tokens remain
    expect(theme['color-text']).toBe(defaultTheme['color-text']);
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
    // dark shadows use higher opacity
    expect(darkTheme['shadow-md']).toContain('0.4');
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

  it('sets CSS variables from custom theme', () => {
    const custom = createTheme({ 'color-primary-6': '#ff0000' });
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({ theme: custom }) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.style.getPropertyValue('--mkt-color-primary-6')).toBe('#ff0000');
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
});
