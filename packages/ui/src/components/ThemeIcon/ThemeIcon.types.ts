import type { MikataSize, MikataColor, MikataBaseProps } from '../../types';

export interface ThemeIconProps extends MikataBaseProps {
  variant?: 'filled' | 'light' | 'outline' | 'transparent' | 'default' | 'gradient';
  size?: MikataSize | number;
  color?: MikataColor;
  radius?: MikataSize | 'full' | number;
  children?: Node;
}
