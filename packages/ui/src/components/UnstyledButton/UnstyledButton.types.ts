import type { MikataBaseProps } from '../../types';

export interface UnstyledButtonProps extends MikataBaseProps {
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
  children?: string | Node;
  /** Render as a different element (e.g. 'a' for links). Default 'button'. */
  as?: 'button' | 'a' | 'div' | 'span';
  /** When `as="a"`, the href */
  href?: string;
}
