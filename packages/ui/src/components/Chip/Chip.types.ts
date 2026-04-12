import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type ChipParts = 'root' | 'label' | 'iconWrap' | 'input';

export interface ChipProps extends MikataBaseProps {
  value?: string;
  /** Controlled checked state */
  checked?: boolean;
  /** Uncontrolled initial state */
  defaultChecked?: boolean;
  size?: MikataSize;
  color?: MikataColor;
  variant?: 'outline' | 'filled' | 'light';
  radius?: MikataSize | 'full';
  disabled?: boolean;
  /** Input type (single ChipGroup uses 'radio', multi uses 'checkbox') */
  type?: 'checkbox' | 'radio';
  name?: string;
  onChange?: (checked: boolean, value?: string) => void;
  classNames?: ClassNamesInput<ChipParts>;
  children?: Node | string;
}
