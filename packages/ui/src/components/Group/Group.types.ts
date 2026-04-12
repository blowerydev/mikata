import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type GroupParts = 'root';

export interface GroupProps extends MikataBaseProps {
  gap?: MikataSize;
  align?: string;
  justify?: string;
  wrap?: boolean;
  grow?: boolean;
  classNames?: ClassNamesInput<GroupParts>;
  children?: Node | Node[];
}
