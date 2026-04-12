/**
 * Attribute map for an SVG element. Values are coerced to strings on apply.
 */
export type IconAttrs = Record<string, string | number>;

/**
 * A single child element inside an icon: `[tag, attrs]` (e.g. `['path', {...}]`).
 * Matches Lucide and Tabler Icons data shape.
 */
export type IconChild = [string, IconAttrs];

/**
 * The tuple representation of an icon: root tag + root attrs + children.
 * Compatible with `lucide` and `@tabler/icons` per-icon exports.
 */
export type IconNode = [string, IconAttrs, IconChild[]];

export interface IconProps {
  /** Sets both width and height. Default: 24. */
  size?: number | string;
  /** Sets the `stroke` attribute. Default: inherits from the icon node (usually 'currentColor'). */
  color?: string;
  /** Overrides stroke-width. Default: inherits from the icon node (usually 2). */
  strokeWidth?: number | string;
  /** CSS class on the root <svg>. */
  class?: string;
  /**
   * Accessible name. When set, the <svg> gets `role="img"` + `aria-label`.
   * Omit for decorative icons — the factory adds `aria-hidden="true"` by default.
   */
  'aria-label'?: string;
  /**
   * Explicit aria-hidden control. Defaults to `true` when no `aria-label` is
   * provided; set to `false` to make a decorative icon visible to assistive
   * tech without a label.
   */
  'aria-hidden'?: boolean;
}
