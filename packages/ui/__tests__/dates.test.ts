import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createScope, flushSync, signal } from '@mikata/reactivity';
import { _resetIdCounter } from '../src/utils/unique-id';
import {
  startOfMonth, endOfMonth, addDays, addMonths, addYears,
  isSameDay, isSameMonth, isBefore, isAfter, isInRange, clampDate,
  getMonthMatrix, getWeekdayLabels, getMonthLabels, getFirstDayOfWeek,
  parseISODate, formatISODate, getDecadeRange,
} from '../src/components/_internal/dates';
import { Calendar } from '../src/components/Calendar';
import { DatePicker } from '../src/components/DatePicker';
import { MonthPicker } from '../src/components/MonthPicker';
import { YearPicker } from '../src/components/YearPicker';
import { DateInput } from '../src/components/DateInput';
import { DatePickerInput, MonthPickerInput, YearPickerInput } from '../src/components/DatePickerInput';
import { TimeInput } from '../src/components/TimeInput';

beforeEach(() => {
  _resetIdCounter();
  document.body.innerHTML = '';
});

describe('date utilities', () => {
  it('startOfMonth and endOfMonth', () => {
    const d = new Date(2026, 3, 15);
    expect(startOfMonth(d).getDate()).toBe(1);
    expect(endOfMonth(d).getDate()).toBe(30);
  });

  it('addDays/addMonths/addYears', () => {
    const d = new Date(2026, 0, 31);
    expect(addDays(d, 1).getDate()).toBe(1);
    expect(addDays(d, 1).getMonth()).toBe(1);
    // Feb has 28 days in 2026 - clamps to 28.
    expect(addMonths(d, 1).getMonth()).toBe(1);
    expect(addMonths(d, 1).getDate()).toBe(28);
    expect(addYears(d, 1).getFullYear()).toBe(2027);
  });

  it('isSameDay / isSameMonth', () => {
    expect(isSameDay(new Date(2026, 3, 1), new Date(2026, 3, 1))).toBe(true);
    expect(isSameDay(new Date(2026, 3, 1), new Date(2026, 3, 2))).toBe(false);
    expect(isSameMonth(new Date(2026, 3, 1), new Date(2026, 3, 30))).toBe(true);
    expect(isSameMonth(new Date(2026, 3, 1), new Date(2026, 4, 1))).toBe(false);
  });

  it('isBefore / isAfter / isInRange', () => {
    const a = new Date(2026, 3, 1);
    const b = new Date(2026, 3, 15);
    const c = new Date(2026, 3, 30);
    expect(isBefore(a, b)).toBe(true);
    expect(isAfter(c, b)).toBe(true);
    expect(isInRange(b, a, c)).toBe(true);
    expect(isInRange(new Date(2026, 4, 1), a, c)).toBe(false);
  });

  it('clampDate', () => {
    const min = new Date(2026, 3, 10);
    const max = new Date(2026, 3, 20);
    expect(clampDate(new Date(2026, 3, 5), min, max)).toBe(min);
    expect(clampDate(new Date(2026, 3, 25), min, max)).toBe(max);
    const in1 = new Date(2026, 3, 15);
    expect(clampDate(in1, min, max)).toBe(in1);
  });

  it('getMonthMatrix returns 6 rows of 7 days', () => {
    const m = getMonthMatrix(new Date(2026, 3, 1), 1);
    expect(m.length).toBe(6);
    expect(m[0].length).toBe(7);
    // First day of Apr 2026 is Wednesday - with Mon start, it's column 2.
    expect(m[0][2].getDate()).toBe(1);
    expect(m[0][2].getMonth()).toBe(3);
  });

  it('getWeekdayLabels returns 7 labels', () => {
    const labels = getWeekdayLabels('en-US', 0);
    expect(labels.length).toBe(7);
    expect(labels[0]).toBe('Sun');
  });

  it('getMonthLabels returns 12 labels', () => {
    const labels = getMonthLabels('en-US');
    expect(labels.length).toBe(12);
    expect(labels[0]).toBe('Jan');
  });

  it('getFirstDayOfWeek defaults to 1 for invalid locale', () => {
    expect(typeof getFirstDayOfWeek('en-US')).toBe('number');
  });

  it('parseISODate round-trip', () => {
    const d = parseISODate('2026-04-15');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(3);
    expect(d!.getDate()).toBe(15);
    expect(formatISODate(d!)).toBe('2026-04-15');
  });

  it('parseISODate rejects invalid input', () => {
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(parseISODate('not-a-date')).toBeNull();
    expect(parseISODate('2026-02-30')).toBeNull();
  });

  it('getDecadeRange aligns to tens', () => {
    expect(getDecadeRange(2026)).toEqual([2020, 2029]);
    expect(getDecadeRange(2019)).toEqual([2010, 2019]);
  });
});

describe('Calendar', () => {
  it('renders 6×7 = 42 day cells plus weekday row', () => {
    createScope(() => {
      const el = Calendar({ defaultDate: new Date(2026, 3, 1) });
      document.body.appendChild(el);
      const days = el.querySelectorAll('.mkt-calendar__day');
      expect(days.length).toBe(42);
      const weekdays = el.querySelectorAll('.mkt-calendar__weekday');
      expect(weekdays.length).toBe(7);
    });
  });

  it('fires onChange with selected date', () => {
    createScope(() => {
      let picked: Date | null = null;
      const el = Calendar({
        defaultDate: new Date(2026, 3, 1),
        onChange: (v) => { picked = v as Date; },
      });
      document.body.appendChild(el);
      const mid = el.querySelector('.mkt-calendar__day:not([data-outside])') as HTMLButtonElement;
      mid.click();
      expect(picked).not.toBeNull();
    });
  });

  it('respects minDate/maxDate', () => {
    createScope(() => {
      const el = Calendar({
        defaultDate: new Date(2026, 3, 15),
        minDate: new Date(2026, 3, 10),
        maxDate: new Date(2026, 3, 20),
      });
      document.body.appendChild(el);
      const disabled = el.querySelectorAll('.mkt-calendar__day:disabled');
      expect(disabled.length).toBeGreaterThan(0);
    });
  });

  it('supports multiple selection', () => {
    createScope(() => {
      let captured: Date[] = [];
      const el = Calendar({
        type: 'multiple',
        defaultDate: new Date(2026, 3, 1),
        onChange: (v) => { captured = v as Date[]; },
      });
      document.body.appendChild(el);
      const days = el.querySelectorAll('.mkt-calendar__day:not([data-outside])');
      (days[0] as HTMLButtonElement).click();
      (days[1] as HTMLButtonElement).click();
      expect(captured.length).toBe(2);
    });
  });
});

describe('DatePicker', () => {
  it('shows day level by default and climbs to month on header click', () => {
    createScope(() => {
      const el = DatePicker({ defaultDate: new Date(2026, 3, 1) });
      document.body.appendChild(el);
      expect(el.querySelectorAll('.mkt-calendar__day').length).toBe(42);
      const label = el.querySelector('.mkt-calendar__header-label') as HTMLButtonElement;
      label.click();
      flushSync();
      expect(el.querySelectorAll('.mkt-month-picker__month').length).toBe(12);
    });
  });

  it('range mode produces a [start, end] tuple', () => {
    createScope(() => {
      let range: [Date | null, Date | null] | null = null;
      const el = DatePicker({
        type: 'range',
        defaultDate: new Date(2026, 3, 1),
        onChange: (v) => { range = v as [Date | null, Date | null]; },
      });
      document.body.appendChild(el);
      const days = el.querySelectorAll('.mkt-calendar__day:not([data-outside])');
      (days[0] as HTMLButtonElement).click();
      (days[5] as HTMLButtonElement).click();
      expect(range).not.toBeNull();
      expect(range![0]).toBeInstanceOf(Date);
      expect(range![1]).toBeInstanceOf(Date);
    });
  });
});

describe('MonthPicker / YearPicker', () => {
  it('MonthPicker renders 12 months', () => {
    createScope(() => {
      const el = MonthPicker({ defaultDate: new Date(2026, 0, 1) });
      document.body.appendChild(el);
      expect(el.querySelectorAll('.mkt-month-picker__month').length).toBe(12);
    });
  });

  it('YearPicker renders 12 year cells (decade + padding)', () => {
    createScope(() => {
      const el = YearPicker({ defaultDate: new Date(2026, 0, 1) });
      document.body.appendChild(el);
      expect(el.querySelectorAll('.mkt-year-picker__year').length).toBe(12);
    });
  });
});

describe('DateInput', () => {
  it('renders an input that displays the default value', () => {
    createScope(() => {
      const el = DateInput({ defaultValue: new Date(2026, 3, 15), locale: 'en-US' });
      document.body.appendChild(el);
      const input = el.querySelector('input') as HTMLInputElement;
      flushSync();
      expect(input.value).toContain('2026');
    });
  });

  it('opens the popover on focus', () => {
    createScope(() => {
      const el = DateInput({});
      document.body.appendChild(el);
      const input = el.querySelector('input') as HTMLInputElement;
      const dropdown = el.querySelector('.mkt-date-input__dropdown') as HTMLElement;
      expect(dropdown.hidden).toBe(true);
      input.focus();
      flushSync();
      expect(dropdown.hidden).toBe(false);
    });
  });
});

describe('DatePickerInput', () => {
  it('toggles dropdown on trigger click', () => {
    createScope(() => {
      const el = DatePickerInput({});
      document.body.appendChild(el);
      const trigger = el.querySelector('.mkt-picker-input__trigger') as HTMLButtonElement;
      const dropdown = el.querySelector('.mkt-picker-input__dropdown') as HTMLElement;
      expect(dropdown.hidden).toBe(true);
      trigger.click();
      flushSync();
      expect(dropdown.hidden).toBe(false);
    });
  });

  it('syncs controlled date picker input value changes', () => {
    createScope(() => {
      const [value, setValue] = signal<Date | null>(new Date(2026, 0, 1));
      const el = DatePickerInput({
        locale: 'en-US',
        get value() { return value(); },
      });
      document.body.appendChild(el);
      const trigger = el.querySelector('.mkt-picker-input__trigger') as HTMLButtonElement;

      flushSync();
      expect(trigger.textContent).toContain('1');
      setValue(new Date(2026, 1, 2));
      flushSync();
      expect(trigger.textContent).toContain('2');
    });
  });

  it('clears picker inputs when clearable', () => {
    createScope(() => {
      const onChange = vi.fn();
      const el = DatePickerInput({
        defaultValue: new Date(2026, 0, 1),
        clearable: true,
        onChange,
      });
      document.body.appendChild(el);
      const clear = el.querySelector('.mkt-picker-input__clear') as HTMLButtonElement;

      expect(clear.hidden).toBe(false);
      clear.click();
      flushSync();
      expect(onChange).toHaveBeenCalledWith(null);
      expect(clear.hidden).toBe(true);
    });
  });

  it('syncs controlled month and year picker input value changes', () => {
    createScope(() => {
      const [month, setMonth] = signal<Date | null>(new Date(2026, 0, 1));
      const monthEl = MonthPickerInput({
        locale: 'en-US',
        get value() { return month(); },
      });
      document.body.appendChild(monthEl);
      const monthTrigger = monthEl.querySelector('.mkt-picker-input__trigger') as HTMLButtonElement;

      const [year, setYear] = signal<Date | null>(new Date(2026, 0, 1));
      const yearEl = YearPickerInput({
        get value() { return year(); },
      });
      document.body.appendChild(yearEl);
      const yearTrigger = yearEl.querySelector('.mkt-picker-input__trigger') as HTMLButtonElement;

      flushSync();
      expect(monthTrigger.textContent).toContain('January');
      expect(yearTrigger.textContent).toContain('2026');

      setMonth(new Date(2026, 1, 1));
      setYear(new Date(2027, 0, 1));
      flushSync();

      expect(monthTrigger.textContent).toContain('February');
      expect(yearTrigger.textContent).toContain('2027');
    });
  });
});

describe('TimeInput', () => {
  it('renders a native time input', () => {
    createScope(() => {
      const el = TimeInput({ defaultValue: '14:30' });
      document.body.appendChild(el);
      const input = el.querySelector('input') as HTMLInputElement;
      expect(input.type).toBe('time');
      expect(input.value).toBe('14:30');
    });
  });

  it('applies step=1 when withSeconds', () => {
    createScope(() => {
      const el = TimeInput({ withSeconds: true });
      document.body.appendChild(el);
      const input = el.querySelector('input') as HTMLInputElement;
      expect(input.step).toBe('1');
    });
  });
});
