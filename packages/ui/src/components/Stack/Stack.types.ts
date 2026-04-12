import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type StackParts = 'root';

export interface StackProps extends MikataBaseProps {
  direction?: 'column' | 'row';
  gap?: MikataSize;
  align?: string;
  justify?: string;
  wrap?: boolean;
  classNames?: ClassNamesInput<StackParts>;
  children?: Node | Node[];
}
