import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type CheckboxParts = 'root' | 'input' | 'label' | 'icon';

export interface CheckboxProps extends MikataBaseProps {
  checked?: boolean;
  defaultChecked?: boolean;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node | (() => string | Node | null | undefined);
  size?: MikataSize;
  color?: MikataColor;
  disabled?: boolean;
  onChange?: (e: Event) => void;
  onBlur?: (e: FocusEvent) => void;
  'aria-invalid'?: boolean;
  classNames?: ClassNamesInput<CheckboxParts>;
}
