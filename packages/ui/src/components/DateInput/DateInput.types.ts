import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type DateInputParts = 'root' | 'input' | 'dropdown' | 'calendar';

export interface DateInputProps extends MikataBaseProps {
  value?: Date | null;
  defaultValue?: Date | null;
  label?: string | Node;
  description?: string | Node;
  error?: string | Node | (() => string | Node | null | undefined);
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  excludeDate?: (d: Date) => boolean;
  locale?: string;
  firstDayOfWeek?: number;
  closeOnChange?: boolean;
  /** Format for the value shown in the input. Defaults to locale short date. */
  valueFormat?: Intl.DateTimeFormatOptions;
  clearable?: boolean;
  size?: MikataSize;
  onChange?: (value: Date | null) => void;
  classNames?: ClassNamesInput<DateInputParts>;
}
