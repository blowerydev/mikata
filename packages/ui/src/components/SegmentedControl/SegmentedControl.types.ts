import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type SegmentedControlParts = 'root' | 'indicator' | 'label' | 'input';

export interface SegmentedControlItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps extends MikataBaseProps {
  data: (string | SegmentedControlItem)[];
  value?: string;
  defaultValue?: string;
  size?: MikataSize;
  color?: MikataColor;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
  classNames?: ClassNamesInput<SegmentedControlParts>;
}
