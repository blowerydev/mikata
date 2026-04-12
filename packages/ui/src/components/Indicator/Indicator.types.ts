import type { MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type IndicatorParts = 'root' | 'indicator';

export interface IndicatorProps extends MikataBaseProps {
  /** Content shown inside the indicator (number, text, or node) */
  label?: string | number | Node;
  /** Indicator size in pixels */
  size?: number;
  /** Offset from the edge */
  offset?: number;
  /** Indicator position */
  position?:
    | 'top-start' | 'top-center' | 'top-end'
    | 'middle-start' | 'middle-center' | 'middle-end'
    | 'bottom-start' | 'bottom-center' | 'bottom-end';
  /** Color palette */
  color?: MikataColor;
  /** Indicator is visible */
  disabled?: boolean;
  /** Animated pulse */
  processing?: boolean;
  /** Inline (target does not get position: relative; assumes it already does) */
  inline?: boolean;
  /** Radius, 'full' for round */
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | number;
  classNames?: ClassNamesInput<IndicatorParts>;
  children?: Node;
}
