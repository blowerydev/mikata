import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { InputWrapperParts } from '../_internal/InputWrapper.types';

export type NumberInputParts = InputWrapperParts | 'input' | 'controls' | 'controlUp' | 'controlDown';

export interface NumberInputProps extends MikataBaseProps {
  value?: number;
  defaultValue?: number;
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node | (() => string | Node | null | undefined);
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (n: number) => void;
  onInput?: (e: InputEvent & { currentTarget: HTMLInputElement }) => void;
  onChange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  classNames?: ClassNamesInput<NumberInputParts>;
}
