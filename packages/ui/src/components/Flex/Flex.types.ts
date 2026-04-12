import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type FlexParts = 'root';

export interface FlexProps extends MikataBaseProps {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  align?: string;
  justify?: string;
  gap?: MikataSize | string;
  rowGap?: MikataSize | string;
  columnGap?: MikataSize | string;
  inline?: boolean;
  classNames?: ClassNamesInput<FlexParts>;
  children?: Node | Node[];
}
