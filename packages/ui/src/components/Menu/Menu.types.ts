import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type MenuParts = 'root' | 'target' | 'dropdown' | 'item' | 'divider' | 'label';

export interface MenuItem {
  type?: 'item';
  label: string | Node;
  icon?: Node;
  disabled?: boolean;
  color?: MikataColor;
  onClick?: () => void;
}

export interface MenuDivider {
  type: 'divider';
}

export interface MenuLabel {
  type: 'label';
  label: string | Node;
}

export type MenuItemDef = MenuItem | MenuDivider | MenuLabel;

export interface MenuProps extends MikataBaseProps {
  target: Node;
  items: MenuItemDef[];
  size?: MikataSize;
  position?: 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top';
  closeOnItemClick?: boolean;
  classNames?: ClassNamesInput<MenuParts>;
}
