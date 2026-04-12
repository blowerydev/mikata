import type { MikataSize, MikataBaseProps } from '../../types';

export interface BackgroundImageProps extends MikataBaseProps {
  src: string;
  radius?: MikataSize | 'full' | number;
  children?: Node | Node[];
}
