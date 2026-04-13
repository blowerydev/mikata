import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type InputParts = 'root' | 'input' | 'section';

export interface InputProps extends MikataBaseProps {
  /** Input type (defaults to 'text') */
  type?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  size?: MikataSize;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  /** Optional element shown inside the left of the input */
  leftSection?: Node;
  /** Optional element shown inside the right of the input */
  rightSection?: Node;
  /** Width of the left section (px). Defaults to 36. */
  leftSectionWidth?: number;
  /** Width of the right section (px). Defaults to 36. */
  rightSectionWidth?: number;
  /** Pointer events are enabled on sections (useful for buttons) */
  leftSectionPointerEvents?: 'auto' | 'none';
  rightSectionPointerEvents?: 'auto' | 'none';
  onInput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  onChange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  /** id assigned to the underlying <input> */
  id?: string;
  classNames?: ClassNamesInput<InputParts>;
}
