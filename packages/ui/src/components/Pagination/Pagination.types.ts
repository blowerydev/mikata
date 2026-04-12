import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type PaginationParts = 'root' | 'item' | 'dots';

export interface PaginationProps extends MikataBaseProps {
  total: number;
  value?: number;
  defaultValue?: number;
  siblings?: number;
  boundaries?: number;
  size?: MikataSize;
  color?: MikataColor;
  onChange?: (page: number) => void;
  classNames?: ClassNamesInput<PaginationParts>;
}
