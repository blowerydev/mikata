import type { MikataBaseProps } from '../../types';

export interface BoxProps extends MikataBaseProps {
  component?: string;
  children?: Node | Node[];
}
