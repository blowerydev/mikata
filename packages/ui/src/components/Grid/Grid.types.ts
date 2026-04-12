import type { MikataSize, MikataBaseProps } from '../../types';

export interface GridProps extends MikataBaseProps {
  columns?: number;
  gap?: MikataSize;
  children?: Node | Node[];
}
