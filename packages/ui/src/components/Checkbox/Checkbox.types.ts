import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type CheckboxParts = 'root' | 'input' | 'label' | 'icon';

export interface CheckboxProps extends MikataBaseProps {
  checked?: boolean;
  defaultChecked?: boolean;
  label?: string;
  description?: string;
  error?: string;
  size?: MikataSize;
  color?: MikataColor;
  disabled?: boolean;
  onChange?: (e: Event) => void;
  classNames?: ClassNamesInput<CheckboxParts>;
}
