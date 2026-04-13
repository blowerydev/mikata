import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';
import type { CalendarParts } from '../Calendar/Calendar.types';

export interface YearPickerProps extends MikataBaseProps {
  value?: Date | null;
  defaultValue?: Date | null;
  date?: Date;
  defaultDate?: Date;
  minDate?: Date;
  maxDate?: Date;
  onChange?: (value: Date) => void;
  onDateChange?: (date: Date) => void;
  size?: MikataSize;
  classNames?: ClassNamesInput<CalendarParts | 'year'>;
}
