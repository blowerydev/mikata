import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { InputWrapperParts } from '../_internal/InputWrapper.types';

export type FileInputParts = InputWrapperParts | 'input' | 'section';

export interface FileInputProps extends MikataBaseProps {
  label?: string | Node;
  description?: string | Node;
  error?: string | Node;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  size?: MikataSize;
  accept?: string;
  multiple?: boolean;
  capture?: boolean | 'user' | 'environment';
  /** Controlled value */
  value?: File | File[] | null;
  /** Called when file(s) selected */
  onChange?: (files: File | File[] | null) => void;
  /** Clear button label (null to hide) */
  clearable?: boolean;
  /** Custom value formatter */
  valueComponent?: (files: File | File[]) => Node | string;
  leftSection?: Node;
  classNames?: ClassNamesInput<FileInputParts>;
}
