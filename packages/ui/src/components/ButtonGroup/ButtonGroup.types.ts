import type { MikataBaseProps } from '../../types';

export interface ButtonGroupProps extends MikataBaseProps {
  orientation?: 'horizontal' | 'vertical';
  children?: Node | Node[];
}
