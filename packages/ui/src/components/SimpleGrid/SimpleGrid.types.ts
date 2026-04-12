import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type SimpleGridParts = 'root';

export interface SimpleGridProps extends MikataBaseProps {
  /** Number of equal-width columns */
  cols?: number;
  /** Gap between cells */
  spacing?: MikataSize | string;
  /** Vertical gap (defaults to spacing) */
  verticalSpacing?: MikataSize | string;
  classNames?: ClassNamesInput<SimpleGridParts>;
  children?: Node | Node[];
}
