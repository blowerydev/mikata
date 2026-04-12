import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { InputWrapperParts } from '../_internal/InputWrapper.types';

export type TextInputParts = InputWrapperParts | 'input';

export interface TextInputProps extends MikataBaseProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  leftSection?: Node;
  rightSection?: Node;
  onInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
  classNames?: ClassNamesInput<TextInputParts>;
}
