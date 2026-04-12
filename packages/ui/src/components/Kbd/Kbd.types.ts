import type { MikataSize, MikataBaseProps } from '../../types';

export interface KbdProps extends MikataBaseProps {
  size?: MikataSize;
  children?: Node | string;
}
