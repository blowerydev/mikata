import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { CalendarParts } from '../Calendar/Calendar.types';

export interface MonthPickerProps extends MikataBaseProps {
  /** Controlled selected month (first day of that month). */
  value?: Date | null;
  defaultValue?: Date | null;
  /** Controlled viewed year. */
  date?: Date;
  defaultDate?: Date;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
  onChange?: (value: Date) => void;
  onDateChange?: (date: Date) => void;
  size?: MikataSize;
  classNames?: ClassNamesInput<CalendarParts | 'month'>;
}
