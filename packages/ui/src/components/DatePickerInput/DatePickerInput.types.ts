import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type PickerInputParts = 'root' | 'trigger' | 'dropdown' | 'placeholder' | 'clear';

interface BasePickerInputProps extends MikataBaseProps {
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
  closeOnChange?: boolean;
  valueFormat?: Intl.DateTimeFormatOptions;
  clearable?: boolean;
  size?: MikataSize;
  classNames?: ClassNamesInput<PickerInputParts>;
}

export interface DatePickerInputProps extends BasePickerInputProps {
  /** Selection mode. */
  type?: 'default' | 'multiple' | 'range';
  value?: Date | Date[] | [Date | null, Date | null] | null;
  defaultValue?: Date | Date[] | [Date | null, Date | null] | null;
  firstDayOfWeek?: number;
  onChange?: (value: Date | Date[] | [Date | null, Date | null] | null) => void;
}

export interface MonthPickerInputProps extends BasePickerInputProps {
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (value: Date | null) => void;
}

export interface YearPickerInputProps extends BasePickerInputProps {
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (value: Date | null) => void;
}
