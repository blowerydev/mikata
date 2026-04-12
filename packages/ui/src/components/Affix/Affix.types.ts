import type { MikataBaseProps } from '../../types';

export interface AffixProps extends MikataBaseProps {
  position?: {
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
  };
  /** Z-index (defaults to --mkt-z-sticky) */
  zIndex?: number;
  children?: Node | Node[];
}
