import type { MikataBaseProps } from '../../types';

export interface DividerProps extends MikataBaseProps {
  orientation?: 'horizontal' | 'vertical';
  color?: string;
  label?: string;
  labelPosition?: 'left' | 'center' | 'right';
}
