import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type CenterParts = 'root';

export interface CenterProps extends MikataBaseProps {
  /** Render as an inline-flex container instead of flex */
  inline?: boolean;
  classNames?: ClassNamesInput<CenterParts>;
  children?: Node | Node[];
}
