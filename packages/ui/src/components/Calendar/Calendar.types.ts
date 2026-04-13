import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type CalendarParts =
  | 'root'
  | 'header'
  | 'headerLabel'
  | 'headerControl'
  | 'monthRow'
  | 'weekdayRow'
  | 'weekday'
  | 'week'
  | 'day'
  | 'dayNumber';

export type CalendarLevel = 'day' | 'month' | 'year';

export interface CalendarProps extends MikataBaseProps {
  /** Controlled selected date (single-select mode). */
  value?: Date | null;
  /** Uncontrolled initial value. */
  defaultValue?: Date | null;
  /** Selected range, for range mode. Tuple may have null for an in-progress pick. */
  rangeValue?: [Date | null, Date | null];
  /** Multiple-selection value for multi-select mode. */
  multipleValue?: Date[];
  /** Selection mode. */
  type?: 'default' | 'multiple' | 'range';
  /** Controlled month being viewed (first day of that month). */
  date?: Date;
  /** Uncontrolled initial viewed month. */
  defaultDate?: Date;
  /** Min selectable date (inclusive). */
  minDate?: Date;
  /** Max selectable date (inclusive). */
  maxDate?: Date;
  /** Predicate for disabling arbitrary dates. */
  excludeDate?: (date: Date) => boolean;
  /** BCP-47 locale for weekday/month labels. Defaults to `navigator.language`. */
  locale?: string;
  /** Override the locale's first day of week (0 = Sun, 1 = Mon, …). */
  firstDayOfWeek?: number;
  /** Called with the newly selected Date, Date[] (multiple) or [Date, Date] (range). */
  onChange?: (value: Date | Date[] | [Date | null, Date | null]) => void;
  /** Called when the viewed month changes. */
  onDateChange?: (date: Date) => void;
  size?: MikataSize;
  /** Hide the "week" label row. */
  hideWeekdays?: boolean;
  /** Hide outside-month days. */
  hideOutsideDates?: boolean;
  classNames?: ClassNamesInput<CalendarParts>;
}
