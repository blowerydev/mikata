import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type FieldsetParts = 'root' | 'legend';

export interface FieldsetProps extends MikataBaseProps {
  /** Legend text / node */
  legend?: string | Node;
  /** Visual variant */
  variant?: 'default' | 'filled' | 'unstyled';
  /** Disable all nested inputs */
  disabled?: boolean;
  classNames?: ClassNamesInput<FieldsetParts>;
  children?: Node | Node[];
}
