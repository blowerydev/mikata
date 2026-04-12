import type { MikataSize, MikataBaseProps } from '../../types';

export interface ChipGroupProps extends MikataBaseProps {
  /** Allow multiple selections (renders children as checkboxes) */
  multiple?: boolean;
  /** Selected value(s). String for single, array for multi. */
  value?: string | string[];
  /** Uncontrolled initial value */
  defaultValue?: string | string[];
  /** Called when selection changes */
  onChange?: (value: string | string[]) => void;
  /** Gap between chips */
  gap?: MikataSize;
  /** Chip children */
  children?: Node | Node[];
}
