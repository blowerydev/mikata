import type { MikataBaseProps } from '../../types';

export type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ContainerProps extends MikataBaseProps {
  size?: ContainerSize;
  fluid?: boolean;
  children?: Node | Node[];
}
