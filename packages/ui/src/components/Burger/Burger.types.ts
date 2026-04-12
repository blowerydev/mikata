import type { MikataBaseProps, MikataSize, MikataColor } from '../../types';

export interface BurgerProps extends MikataBaseProps {
  /** Whether the menu is open (animates to X) */
  opened?: boolean;
  onClick?: (e: MouseEvent) => void;
  size?: MikataSize | number;
  color?: MikataColor;
  disabled?: boolean;
  /** Accessible label; falls back to "Toggle menu" */
  ariaLabel?: string;
}
