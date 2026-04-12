import type { MikataBaseProps } from '../../types';

export type TitleOrder = 1 | 2 | 3 | 4 | 5 | 6;

export interface TitleProps extends MikataBaseProps {
  order?: TitleOrder;
  children?: Node | string;
}
