import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { InputWrapperParts } from '../_internal/InputWrapper.types';

export type PasswordInputParts = InputWrapperParts | 'input' | 'toggleButton';

export interface PasswordInputProps extends MikataBaseProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  onInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
  classNames?: ClassNamesInput<PasswordInputParts>;
}
