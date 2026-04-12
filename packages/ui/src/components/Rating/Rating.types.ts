import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type RatingParts = 'root' | 'symbolBody' | 'symbolGroup' | 'input' | 'label';

export interface RatingProps extends MikataBaseProps {
  /** Controlled current value */
  value?: number;
  /** Uncontrolled initial value */
  defaultValue?: number;
  /** Total number of symbols */
  count?: number;
  /** Fractions per symbol (1 = integer, 2 = halves, 4 = quarters) */
  fractions?: number;
  /** Size */
  size?: MikataSize;
  /** Color (accent) */
  color?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Called on select */
  onChange?: (value: number) => void;
  /** Called on hover change */
  onHover?: (value: number) => void;
  classNames?: ClassNamesInput<RatingParts>;
}
