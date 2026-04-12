import type { MikataSize, MikataColor, MikataBaseProps } from '../../types';

export interface TextProps extends MikataBaseProps {
  size?: MikataSize;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'inherit' | 'dimmed' | MikataColor;
  truncate?: boolean;
  lineClamp?: number;
  inline?: boolean;
  component?: string;
  children?: Node | string;
}
