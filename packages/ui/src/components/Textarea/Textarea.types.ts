import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { InputWrapperParts } from '../_internal/InputWrapper.types';

export type TextareaParts = InputWrapperParts | 'input';

export interface TextareaProps extends MikataBaseProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node | (() => string | Node | null | undefined);
  required?: boolean;
  disabled?: boolean;
  size?: MikataSize;
  rows?: number;
  autosize?: boolean;
  onInput?: (e: InputEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onChange?: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
  onBlur?: (e: FocusEvent & { currentTarget: HTMLTextAreaElement }) => void;
  'aria-invalid'?: boolean;
  classNames?: ClassNamesInput<TextareaParts>;
}
