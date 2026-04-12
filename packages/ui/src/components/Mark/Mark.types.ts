import type { MikataColor, MikataBaseProps } from '../../types';

export interface MarkProps extends MikataBaseProps {
  color?: MikataColor;
  children?: Node | string;
}
