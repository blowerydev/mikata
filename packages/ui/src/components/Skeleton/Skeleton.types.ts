import type { MikataSize, MikataBaseProps } from '../../types';

export interface SkeletonProps extends MikataBaseProps {
  height?: string;
  width?: string;
  radius?: MikataSize | 'full';
  circle?: boolean;
  visible?: boolean;
  children?: Node;
}
