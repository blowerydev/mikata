import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type SwitchParts = 'root' | 'input' | 'track' | 'thumb' | 'label';

export interface SwitchProps extends MikataBaseProps {
  checked?: boolean;
  defaultChecked?: boolean;
  label?: string | Node;
  description?: string;
  error?: string;
  size?: MikataSize;
  color?: MikataColor;
  disabled?: boolean;
  onChange?: (e: Event) => void;
  classNames?: ClassNamesInput<SwitchParts>;
}
