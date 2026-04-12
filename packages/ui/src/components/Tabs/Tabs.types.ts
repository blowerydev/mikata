import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type TabsParts = 'root' | 'list' | 'tab' | 'panel';
export type TabsVariant = 'default' | 'outline' | 'pills';

export interface TabItem {
  value: string;
  label: string | Node;
  content: Node | string | (() => Node);
  disabled?: boolean;
  icon?: Node;
}

export interface TabsProps extends MikataBaseProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  variant?: TabsVariant;
  size?: MikataSize;
  color?: MikataColor;
  orientation?: 'horizontal' | 'vertical';
  onChange?: (value: string) => void;
  classNames?: ClassNamesInput<TabsParts>;
}
