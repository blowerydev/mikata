import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { CalendarParts } from '../Calendar/Calendar.types';

export interface DatePickerProps extends MikataBaseProps {
  /** Selection mode. */
  type?: 'default' | 'multiple' | 'range';
  /** Controlled value. Shape depends on `type`. */
  value?: Date | Date[] | [Date | null, Date | null] | null;
  defaultValue?: Date | Date[] | [Date | null, Date | null] | null;
  /** Initial drill level. */
  defaultLevel?: 'day' | 'month' | 'year';
  /** Max drill level; level button won't climb beyond this. */
  maxLevel?: 'day' | 'month' | 'year';
  date?: Date;
  defaultDate?: Date;
  minDate?: Date;
  maxDate?: Date;
  excludeDate?: (date: Date) => boolean;
  locale?: string;
  firstDayOfWeek?: number;
  onChange?: (value: Date | Date[] | [Date | null, Date | null]) => void;
  onDateChange?: (date: Date) => void;
  onLevelChange?: (level: 'day' | 'month' | 'year') => void;
  size?: MikataSize;
  hideWeekdays?: boolean;
  hideOutsideDates?: boolean;
  classNames?: ClassNamesInput<CalendarParts>;
}
