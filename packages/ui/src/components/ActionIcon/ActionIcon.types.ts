import type { MikataSize, MikataColor, MikataBaseProps } from '../../types';

export type ActionIconVariant = 'filled' | 'outline' | 'light' | 'subtle' | 'transparent';

export interface ActionIconProps extends MikataBaseProps {
  variant?: ActionIconVariant;
  size?: MikataSize;
  color?: MikataColor;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: MouseEvent) => void;
  'aria-label'?: string;
  children?: Node;
}
