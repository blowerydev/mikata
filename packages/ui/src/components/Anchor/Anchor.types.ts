import type { MikataSize, MikataColor, MikataBaseProps } from '../../types';

export interface AnchorProps extends MikataBaseProps {
  href?: string;
  target?: string;
  underline?: 'always' | 'hover' | 'never';
  color?: MikataColor;
  size?: MikataSize;
  children?: Node | string;
}
