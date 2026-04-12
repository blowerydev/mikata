import { defaultTheme } from './tokens';
import { darkTheme } from './dark';
import { BUILT_IN_COLORS } from './palettes';
import type { MikataTheme, PrimaryShade } from './types';

const SEMANTIC_COLOR_ALIASES = ['filled', 'filled-hover', 'light', 'light-hover', 'border'] as const;

const DEFAULT_HEADING_SIZES = {
  h1: { size: '2.125rem', lineHeight: '1.3' },
  h2: { size: '1.625rem', lineHeight: '1.35' },
  h3: { size: '1.375rem', lineHeight: '1.4' },
  h4: { size: '1.125rem', lineHeight: '1.45' },
  h5: { size: '1rem', lineHeight: '1.5' },
  h6: { size: '0.875rem', lineHeight: '1.5' },
} as const;

const RADIUS_KEYS = new Set(['xs', 'sm', 'md', 'lg', 'xl', 'full']);

function resolvePrimaryShade(shade: PrimaryShade | undefined, scheme: 'light' | 'dark'): number {
  if (shade == null) return scheme === 'dark' ? 8 : 6;
  if (typeof shade === 'number') return shade;
  return shade[scheme];
}

function clampShade(n: number): number {
  return Math.max(0, Math.min(9, n));
}

/**
 * Produce a flat { token-name: css-value } record for the given structured
 * theme + color scheme. The record is what ThemeProvider writes to the wrapper
 * element's `style.setProperty('--mkt-{key}', value)` calls.
 *
 * Back-compat: if called with a flat-shaped Record<string,string> disguised as
 * a theme, passes the extra keys through via `other`.
 */
export function flattenTheme(theme: MikataTheme, scheme: 'light' | 'dark'): Record<string, string> {
  const out: Record<string, string> = {};

  // ── 1. Base tokens (palettes + spacing + typography + sizing + radii + shadows + z-index) ──
  for (const [k, v] of Object.entries(defaultTheme)) out[k] = v;
  if (scheme === 'dark') for (const [k, v] of Object.entries(darkTheme)) out[k] = v;

  // ── 2. Custom palette shades (merged over built-ins) ──
  for (const [name, palette] of Object.entries(theme.colors ?? {})) {
    for (let i = 0; i < 10; i++) out[`color-${name}-${i}`] = palette[i];
  }

  // ── 3. Semantic shade aliases for every known palette ──
  const allColorNames = new Set<string>([...Object.keys(BUILT_IN_COLORS), ...Object.keys(theme.colors ?? {})]);
  const primaryShade = resolvePrimaryShade(theme.primaryShade, scheme);
  const hoverShade = clampShade(primaryShade + 1);

  for (const name of allColorNames) {
    out[`color-${name}-filled`] = `var(--mkt-color-${name}-${primaryShade})`;
    out[`color-${name}-filled-hover`] = `var(--mkt-color-${name}-${hoverShade})`;
    if (scheme === 'dark') {
      out[`color-${name}-light`] = `color-mix(in srgb, var(--mkt-color-${name}-filled) 15%, transparent)`;
      out[`color-${name}-light-hover`] = `color-mix(in srgb, var(--mkt-color-${name}-filled) 25%, transparent)`;
      out[`color-${name}-border`] = `var(--mkt-color-${name}-4)`;
    } else {
      out[`color-${name}-light`] = `var(--mkt-color-${name}-0)`;
      out[`color-${name}-light-hover`] = `var(--mkt-color-${name}-1)`;
      out[`color-${name}-border`] = `var(--mkt-color-${name}-3)`;
    }
  }

  // ── 4. primaryColor — alias primary-* to the chosen palette ──
  const primaryName = theme.primaryColor ?? 'primary';
  if (primaryName !== 'primary') {
    if (!allColorNames.has(primaryName)) {
      throw new Error(`[mikata/ui] primaryColor "${primaryName}" is not a known palette. Add it via theme.colors.${primaryName}.`);
    }
    for (let i = 0; i < 10; i++) out[`color-primary-${i}`] = `var(--mkt-color-${primaryName}-${i})`;
    for (const alias of SEMANTIC_COLOR_ALIASES) {
      out[`color-primary-${alias}`] = `var(--mkt-color-${primaryName}-${alias})`;
    }
  }

  // ── 5. defaultRadius ──
  const radius = theme.defaultRadius ?? 'sm';
  out['radius-default'] = RADIUS_KEYS.has(radius) ? `var(--mkt-radius-${radius})` : radius;

  // ── 6. Font family overrides ──
  if (theme.fontFamily) out['font-family'] = theme.fontFamily;
  if (theme.fontFamilyMono) out['font-family-mono'] = theme.fontFamilyMono;

  // ── 7. Headings ──
  const headingWeight = theme.headings?.fontWeight ?? '700';
  const headingFamily = theme.headings?.fontFamily;
  if (headingFamily) out['heading-font-family'] = headingFamily;
  for (const h of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
    const user = theme.headings?.[h] ?? {};
    const d = DEFAULT_HEADING_SIZES[h];
    out[`${h}-size`] = user.size ?? d.size;
    out[`${h}-weight`] = user.weight ?? headingWeight;
    out[`${h}-lh`] = user.lineHeight ?? d.lineHeight;
  }

  // ── 8. cssVariablesResolver — user hook for extras ──
  if (theme.cssVariablesResolver) {
    const extra = theme.cssVariablesResolver({ theme, colorScheme: scheme });
    if (extra.variables) Object.assign(out, extra.variables);
    const schemeOverrides = scheme === 'dark' ? extra.dark : extra.light;
    if (schemeOverrides) Object.assign(out, schemeOverrides);
  }

  // ── 9. `other` — highest precedence scalar overrides ──
  if (theme.other) Object.assign(out, theme.other);

  return out;
}
