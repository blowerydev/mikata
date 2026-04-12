import type { MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type BlockquoteParts = 'root' | 'cite' | 'icon';

export interface BlockquoteProps extends MikataBaseProps {
  /** Accent color for the left border and icon */
  color?: MikataColor;
  /** Citation text displayed beneath the quote */
  cite?: string | Node;
  /** Optional icon rendered on the left */
  icon?: Node;
  classNames?: ClassNamesInput<BlockquoteParts>;
  children?: Node | string;
}
