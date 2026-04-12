import type { MikataSize, MikataColor, MikataBaseProps } from '../../types';

export type BadgeVariant = 'filled' | 'light' | 'outline' | 'dot';

export interface BadgeProps extends MikataBaseProps {
  variant?: BadgeVariant;
  size?: MikataSize;
  color?: MikataColor;
  children?: Node | string;
}
