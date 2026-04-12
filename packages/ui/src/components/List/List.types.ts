import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type ListParts = 'root' | 'item' | 'itemIcon';

export interface ListItemProps extends MikataBaseProps {
  /** Optional icon (Node) shown before the item content, overrides list's icon */
  icon?: Node;
  children?: Node | Node[] | string;
}

export interface ListProps extends MikataBaseProps {
  /** Use an ordered list (`ol`) instead of unordered (`ul`) */
  type?: 'ordered' | 'unordered';
  /** Default icon rendered for each item (replaces the bullet/number) */
  icon?: Node | (() => Node);
  /** Font size */
  size?: MikataSize;
  /** Gap between items */
  spacing?: MikataSize;
  /** Center list items relative to their icon */
  center?: boolean;
  /** Indent to align with icon-less lists */
  withPadding?: boolean;
  classNames?: ClassNamesInput<ListParts>;
  children?: Node | Node[];
}
