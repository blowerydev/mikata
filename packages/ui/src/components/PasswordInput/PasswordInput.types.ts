import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { InputWrapperParts } from '../_internal/InputWrapper.types';

export type PasswordInputParts = InputWrapperParts | 'input' | 'toggleButton';

export interface PasswordInputProps extends MikataBaseProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node | (() => string | Node | null | undefined);
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  onInput?: (e: InputEvent & { currentTarget: HTMLInputElement }) => void;
  onChange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  onBlur?: (e: FocusEvent & { currentTarget: HTMLInputElement }) => void;
  'aria-invalid'?: boolean;
  classNames?: ClassNamesInput<PasswordInputParts>;
}
