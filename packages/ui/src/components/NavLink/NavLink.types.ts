import type { MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type NavLinkParts = 'root' | 'icon' | 'label' | 'description' | 'chevron' | 'children';
export type NavLinkVariant = 'light' | 'filled' | 'subtle';

export interface NavLinkProps extends MikataBaseProps {
  label: string | Node;
  description?: string | Node;
  icon?: Node;
  active?: boolean;
  disabled?: boolean;
  variant?: NavLinkVariant;
  color?: MikataColor;
  href?: string;
  onClick?: (e: MouseEvent) => void;
  opened?: boolean;
  defaultOpened?: boolean;
  children?: Node[];
  classNames?: ClassNamesInput<NavLinkParts>;
}
