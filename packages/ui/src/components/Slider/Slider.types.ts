import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type SliderParts = 'root' | 'track' | 'input' | 'label';

export interface SliderProps extends MikataBaseProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  color?: MikataColor;
  size?: MikataSize;
  label?: string | ((value: number) => string);
  disabled?: boolean;
  onValueChange?: (n: number) => void;
  classNames?: ClassNamesInput<SliderParts>;
}
