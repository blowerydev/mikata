import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type ButtonVariant = 'filled' | 'outline' | 'light' | 'subtle' | 'transparent';
export type ButtonParts = 'root' | 'label' | 'loader' | 'icon';

export interface ButtonProps extends MikataBaseProps {
  variant?: ButtonVariant;
  size?: MikataSize;
  color?: MikataColor;
  loading?: boolean;
  leftIcon?: Node;
  rightIcon?: Node;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'submit' | 'reset' | 'button';
  onClick?: (e: MouseEvent) => void;
  classNames?: ClassNamesInput<ButtonParts>;
  children?: Node | string;
}
