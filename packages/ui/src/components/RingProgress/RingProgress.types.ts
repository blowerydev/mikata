import type { MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type RingProgressParts = 'root' | 'svg' | 'label';

export interface RingProgressSection {
  value: number;
  color?: MikataColor | string;
  tooltip?: string;
}

export interface RingProgressProps extends MikataBaseProps {
  /** Outer diameter in px */
  size?: number;
  /** Ring thickness in px */
  thickness?: number;
  /** Single value as shorthand (0-100) for a one-section ring */
  value?: number;
  /** Multi-section ring. Sum of values should be <= 100 */
  sections?: RingProgressSection[];
  /** Color for single-value mode */
  color?: MikataColor | string;
  /** Ring color for unfilled portion */
  rootColor?: string;
  /** Rounded caps on sections */
  roundCaps?: boolean;
  /** Label rendered in the center */
  label?: Node | string;
  classNames?: ClassNamesInput<RingProgressParts>;
}
