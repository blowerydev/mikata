import type { MikataBaseProps, MikataSize, MikataColor, ClassNamesInput } from '../../types';

export type RangeSliderParts = 'root' | 'label' | 'track' | 'bar' | 'thumb';

export interface RangeSliderProps extends MikataBaseProps {
  value?: [number, number];
  defaultValue?: [number, number];
  min?: number;
  max?: number;
  step?: number;
  /** Minimum distance allowed between the two thumbs (same unit as value). Default 0. */
  minRange?: number;
  size?: MikataSize;
  color?: MikataColor;
  /** Optional label shown above the track. If function, receives current [min,max]. */
  label?: string | ((value: [number, number]) => string);
  disabled?: boolean;
  /** Fires during drag/keyboard */
  onValueChange?: (value: [number, number]) => void;
  /** Fires when drag/input ends */
  onValueChangeEnd?: (value: [number, number]) => void;
  classNames?: ClassNamesInput<RangeSliderParts>;
}
