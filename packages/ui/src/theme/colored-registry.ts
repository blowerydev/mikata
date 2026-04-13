/**
 * Registry of per-palette CSS rules. ThemeProvider uses it to emit runtime
 * CSS for custom palettes added via `theme.colors` - built-in palettes are
 * already covered by each component's static stylesheet.
 *
 * Each rule names a selector template (with `{name}` token for the palette)
 * and a set of declarations. A declaration value can be:
 *
 *   - a `ColorVarAlias` - `var(--mkt-color-<name>-<alias>)`
 *   - a number 0–9    - `var(--mkt-color-<name>-<N>)`
 *   - a `=literal`     - used verbatim (e.g., `=#fff`)
 */

export type ColorVarAlias =
  | 'filled'
  | 'filled-hover'
  | 'light'
  | 'light-hover'
  | 'border';

export type ColoredDeclValue = ColorVarAlias | number | `=${string}`;

export interface ColoredRule {
  /** Selector template. The substring `{name}` is replaced with the palette name. */
  selector: string;
  /** CSS property → value mapping. */
  decls: Record<string, ColoredDeclValue>;
}

const registry: ColoredRule[] = [];

/** Register a colored rule. Duplicate selectors are replaced. */
export function registerColored(rule: ColoredRule): void {
  const existing = registry.findIndex((r) => r.selector === rule.selector);
  if (existing >= 0) registry[existing] = rule;
  else registry.push(rule);
}

export function getColoredRegistry(): readonly ColoredRule[] {
  return registry;
}

function resolveValue(name: string, value: ColoredDeclValue): string {
  if (typeof value === 'number') return `var(--mkt-color-${name}-${value})`;
  if (typeof value === 'string' && value.startsWith('=')) return value.slice(1);
  return `var(--mkt-color-${name}-${value})`;
}

/**
 * Emit CSS for every registered rule × every palette in `paletteNames`.
 * Returns an empty string when there are no custom palettes.
 */
export function emitColoredRules(paletteNames: readonly string[]): string {
  if (paletteNames.length === 0) return '';
  const lines: string[] = [];
  for (const rule of registry) {
    const declEntries = Object.entries(rule.decls);
    if (declEntries.length === 0) continue;
    for (const name of paletteNames) {
      const selector = rule.selector.replaceAll('{name}', name);
      const body = declEntries
        .map(([prop, val]) => `${prop}: ${resolveValue(name, val)};`)
        .join(' ');
      lines.push(`${selector} { ${body} }`);
    }
  }
  return lines.join('\n');
}
