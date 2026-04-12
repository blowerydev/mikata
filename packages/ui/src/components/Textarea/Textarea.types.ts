import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { InputWrapperParts } from '../_internal/InputWrapper.types';

export type TextareaParts = InputWrapperParts | 'input';

export interface TextareaProps extends MikataBaseProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  rows?: number;
  autosize?: boolean;
  onInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
  classNames?: ClassNamesInput<TextareaParts>;
}
