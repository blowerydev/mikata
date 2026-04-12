import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { InputWrapperParts } from '../_internal/InputWrapper.types';

export type PasswordInputParts = InputWrapperParts | 'input' | 'toggleButton';

export interface PasswordInputProps extends MikataBaseProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node;
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  onInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
  onBlur?: (e: FocusEvent) => void;
  'aria-invalid'?: boolean;
  classNames?: ClassNamesInput<PasswordInputParts>;
}
