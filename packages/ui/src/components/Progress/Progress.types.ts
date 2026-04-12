import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type ProgressParts = 'root' | 'bar' | 'label';

export interface ProgressProps extends MikataBaseProps {
  value: number;
  size?: MikataSize;
  color?: MikataColor;
  striped?: boolean;
  animated?: boolean;
  label?: string;
  classNames?: ClassNamesInput<ProgressParts>;
}
