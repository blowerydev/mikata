import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type RadioParts = 'root' | 'input' | 'label' | 'icon';

export interface RadioProps extends MikataBaseProps {
  checked?: boolean;
  defaultChecked?: boolean;
  name?: string;
  value?: string;
  label?: string;
  description?: string;
  error?: string;
  size?: MikataSize;
  color?: MikataColor;
  disabled?: boolean;
  onChange?: (e: Event) => void;
  classNames?: ClassNamesInput<RadioParts>;
}
