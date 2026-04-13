import { signal, effect } from '@mikata/reactivity';
import { createIcon, ChevronLeft, ChevronRight } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { useDirection } from '../../theme';
import {
  startOfMonth, addMonths, addDays, isSameDay, isSameMonth,
  isBefore, isAfter, isInRange, clampDate,
  getMonthMatrix, getMonthLabels, getWeekdayLabels, getFirstDayOfWeek,
  getDecadeRange,
} from '../_internal/dates';
import type { DatePickerProps } from './DatePicker.types';
import '../Calendar/Calendar.css';
import '../MonthPicker/MonthPicker.css';
import '../YearPicker/YearPicker.css';

type Level = 'day' | 'month' | 'year';
type Value = Date | Date[] | [Date | null, Date | null] | null;

export function DatePicker(userProps: DatePickerProps = {}): HTMLElement {
  const props = { ...useComponentDefaults<DatePickerProps>('DatePicker'), ...userProps };
  const {
    type = 'default',
    value,
    defaultValue = null,
    defaultLevel = 'day',
    maxLevel = 'year',
    date,
    defaultDate,
    minDate,
    maxDate,
    excludeDate,
    locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    firstDayOfWeek,
    onChange,
    onDateChange,
    onLevelChange,
    size = 'md',
    hideWeekdays = false,
    hideOutsideDates = false,
    classNames,
    class: className,
    ref,
  } = props;

  const fdow = firstDayOfWeek ?? getFirstDayOfWeek(locale);
  const direction = useDirection();
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });

  const seed = (() => {
    if (value instanceof Date) return value;
    if (Array.isArray(value) && value[0] instanceof Date) return value[0];
    if (defaultValue instanceof Date) return defaultValue;
    if (Array.isArray(defaultValue) && defaultValue[0] instanceof Date) return defaultValue[0];
    return date ?? defaultDate ?? new Date();
  })();

  const [viewDate, setViewDate] = signal(startOfMonth(seed));
  const [level, setLevel] = signal<Level>(defaultLevel);
  const [selected, setSelected] = signal<Value>(value !== undefined ? value : defaultValue);
  const [hover, setHover] = signal<Date | null>(null);

  function updateView(next: Date) {
    setViewDate(startOfMonth(next));
    onDateChange?.(next);
  }

  function changeLevel(next: Level) {
    setLevel(next);
    onLevelChange?.(next);
  }

  function canClimb(from: Level): Level | null {
    const order: Level[] = ['day', 'month', 'year'];
    const cap = order.indexOf(maxLevel);
    const cur = order.indexOf(from);
    return cur < cap ? order[cur + 1] : null;
  }

  function dateDisabled(d: Date): boolean {
    if (minDate && isBefore(d, minDate)) return true;
    if (maxDate && isAfter(d, maxDate)) return true;
    if (excludeDate?.(d)) return true;
    return false;
  }

  function pickDay(d: Date) {
    if (dateDisabled(d)) return;
    if (type === 'default') {
      setSelected(d);
      onChange?.(d);
    } else if (type === 'multiple') {
      const cur = (selected() as Date[] | null) ?? [];
      const idx = cur.findIndex((x) => isSameDay(x, d));
      const next = idx === -1 ? [...cur, d] : cur.filter((_, i) => i !== idx);
      setSelected(next);
      onChange?.(next);
    } else {
      const [s, e] = (selected() as [Date | null, Date | null] | null) ?? [null, null];
      if (!s || (s && e)) {
        const next: [Date | null, Date | null] = [d, null];
        setSelected(next);
        onChange?.(next);
      } else {
        const next: [Date, Date] = isBefore(d, s) ? [d, s] : [s, d];
        setSelected(next);
        onChange?.(next);
      }
    }
  }

  const isSelectedDay = (d: Date): boolean => {
    const v = selected();
    if (type === 'default') return v instanceof Date && isSameDay(v, d);
    if (type === 'multiple') return Array.isArray(v) && v.some((x) => x instanceof Date && isSameDay(x, d));
    if (Array.isArray(v)) {
      const [s, e] = v as [Date | null, Date | null];
      return !!((s && isSameDay(s, d)) || (e && isSameDay(e, d)));
    }
    return false;
  };

  const isInSelectedRange = (d: Date): boolean => {
    if (type !== 'range') return false;
    const v = selected();
    if (!Array.isArray(v)) return false;
    const [s, e] = v as [Date | null, Date | null];
    if (s && e) return isInRange(d, s, e);
    if (s && hover()) return isInRange(d, s, hover()!);
    return false;
  };

  // --- DOM -------------------------------------------------------------
  const root = document.createElement('div');
  root.className = mergeClasses('mkt-calendar', className, classNames?.root);
  root.dataset.size = size;

  const header = document.createElement('div');
  header.className = mergeClasses('mkt-calendar__header', classNames?.header);

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = mergeClasses('mkt-calendar__header-control', classNames?.headerControl);
  prevBtn.appendChild(createIcon(ChevronLeft, { size: 16 }));

  const label = document.createElement('button');
  label.type = 'button';
  label.className = mergeClasses('mkt-calendar__header-label', classNames?.headerLabel);

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = mergeClasses('mkt-calendar__header-control', classNames?.headerControl);
  nextBtn.appendChild(createIcon(ChevronRight, { size: 16 }));

  effect(() => {
    const rtl = direction() === 'rtl';
    header.innerHTML = '';
    if (rtl) { header.appendChild(nextBtn); header.appendChild(label); header.appendChild(prevBtn); }
    else { header.appendChild(prevBtn); header.appendChild(label); header.appendChild(nextBtn); }
  });

  prevBtn.addEventListener('click', () => {
    const l = level();
    if (l === 'day') updateView(addMonths(viewDate(), -1));
    else if (l === 'month') updateView(new Date(viewDate().getFullYear() - 1, viewDate().getMonth(), 1));
    else updateView(new Date(viewDate().getFullYear() - 10, 0, 1));
  });
  nextBtn.addEventListener('click', () => {
    const l = level();
    if (l === 'day') updateView(addMonths(viewDate(), 1));
    else if (l === 'month') updateView(new Date(viewDate().getFullYear() + 1, viewDate().getMonth(), 1));
    else updateView(new Date(viewDate().getFullYear() + 10, 0, 1));
  });

  label.addEventListener('click', () => {
    const next = canClimb(level());
    if (next) changeLevel(next);
  });

  effect(() => {
    const l = level();
    const v = viewDate();
    if (l === 'day') {
      label.textContent = monthFormatter.format(v);
      prevBtn.setAttribute('aria-label', 'Previous month');
      nextBtn.setAttribute('aria-label', 'Next month');
    } else if (l === 'month') {
      label.textContent = String(v.getFullYear());
      prevBtn.setAttribute('aria-label', 'Previous year');
      nextBtn.setAttribute('aria-label', 'Next year');
    } else {
      const [ds, de] = getDecadeRange(v.getFullYear());
      label.textContent = `${ds} – ${de}`;
      prevBtn.setAttribute('aria-label', 'Previous decade');
      nextBtn.setAttribute('aria-label', 'Next decade');
    }
    label.disabled = canClimb(l) === null;
  });

  // Weekday row (day level only)
  const weekdayRow = document.createElement('div');
  weekdayRow.className = mergeClasses('mkt-calendar__grid', classNames?.weekdayRow);

  effect(() => {
    const show = level() === 'day' && !hideWeekdays;
    weekdayRow.style.display = show ? '' : 'none';
    if (!show) return;
    weekdayRow.innerHTML = '';
    for (const l of getWeekdayLabels(locale, fdow, 'short')) {
      const el = document.createElement('span');
      el.className = mergeClasses('mkt-calendar__weekday', classNames?.weekday);
      el.textContent = l;
      weekdayRow.appendChild(el);
    }
  });

  // Body — swaps based on level
  const body = document.createElement('div');
  body.setAttribute('role', 'grid');

  function renderDayGrid() {
    body.className = mergeClasses('mkt-calendar__grid', classNames?.monthRow);
    body.innerHTML = '';
    const matrix = getMonthMatrix(viewDate(), fdow);
    const today = new Date();
    const viewMonth = viewDate();
    const v = selected();
    const rangeTuple = type === 'range' && Array.isArray(v) ? (v as [Date | null, Date | null]) : null;

    for (const row of matrix) {
      for (const day of row) {
        const inMonth = isSameMonth(day, viewMonth);
        if (!inMonth && hideOutsideDates) {
          const ph = document.createElement('span');
          ph.className = 'mkt-calendar__day';
          ph.style.visibility = 'hidden';
          body.appendChild(ph);
          continue;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = mergeClasses('mkt-calendar__day', classNames?.day);
        btn.textContent = String(day.getDate());
        btn.dataset.date = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
        if (!inMonth) btn.dataset.outside = '';
        if (isSameDay(day, today)) btn.dataset.today = '';
        if (day.getDay() === 0 || day.getDay() === 6) btn.dataset.weekend = '';
        if (isSelectedDay(day)) { btn.dataset.selected = ''; btn.setAttribute('aria-selected', 'true'); }
        if (isInSelectedRange(day)) btn.dataset.inRange = '';
        if (rangeTuple) {
          if (rangeTuple[0] && isSameDay(rangeTuple[0], day)) btn.dataset.rangeStart = '';
          if (rangeTuple[1] && isSameDay(rangeTuple[1], day)) btn.dataset.rangeEnd = '';
        }
        if (dateDisabled(day)) btn.disabled = true;
        btn.addEventListener('click', () => pickDay(day));
        if (type === 'range') {
          btn.addEventListener('mouseenter', () => setHover(day));
          btn.addEventListener('mouseleave', () => setHover(null));
        }
        body.appendChild(btn);
      }
    }
  }

  function renderMonthGrid() {
    body.className = mergeClasses('mkt-month-picker__grid', classNames?.monthRow);
    body.innerHTML = '';
    const labels = getMonthLabels(locale, 'short');
    const y = viewDate().getFullYear();
    for (let m = 0; m < 12; m++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = mergeClasses('mkt-month-picker__month');
      btn.textContent = labels[m];
      btn.dataset.month = `${y}-${m}`;
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m + 1, 0);
      if ((minDate && isBefore(monthEnd, minDate)) || (maxDate && isAfter(monthStart, maxDate))) {
        btn.disabled = true;
      }
      btn.addEventListener('click', () => {
        updateView(new Date(y, m, 1));
        changeLevel('day');
      });
      body.appendChild(btn);
    }
  }

  function renderYearGrid() {
    body.className = mergeClasses('mkt-year-picker__grid', classNames?.monthRow);
    body.innerHTML = '';
    const [start] = getDecadeRange(viewDate().getFullYear());
    for (let offset = -1; offset <= 10; offset++) {
      const y = start + offset;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = mergeClasses('mkt-year-picker__year');
      btn.textContent = String(y);
      btn.dataset.year = String(y);
      if (offset < 0 || offset > 9) btn.dataset.outside = '';
      if ((minDate && isBefore(new Date(y, 11, 31), minDate)) || (maxDate && isAfter(new Date(y, 0, 1), maxDate))) {
        btn.disabled = true;
      }
      btn.addEventListener('click', () => {
        updateView(new Date(y, viewDate().getMonth(), 1));
        changeLevel('month');
      });
      body.appendChild(btn);
    }
  }

  effect(() => {
    // Reads: level, viewDate, selected, hover — re-run whenever any changes.
    selected(); hover();
    const l = level();
    if (l === 'day') renderDayGrid();
    else if (l === 'month') renderMonthGrid();
    else renderYearGrid();
  });

  // Keyboard nav (day level only — month/year are arrowless for brevity).
  body.addEventListener('keydown', (e: KeyboardEvent) => {
    if (level() !== 'day') return;
    const target = e.target as HTMLElement;
    if (!target.classList.contains('mkt-calendar__day')) return;
    const [y, m, d] = (target.dataset.date ?? '').split('-').map(Number);
    if (Number.isNaN(y)) return;
    const cur = new Date(y, m, d);
    const rtl = direction() === 'rtl';
    const keyMap: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let next: Date | null = null;
    if (keyMap[e.key] !== undefined) next = addDays(cur, keyMap[e.key]);
    else if (e.key === 'PageUp') next = addMonths(cur, e.shiftKey ? -12 : -1);
    else if (e.key === 'PageDown') next = addMonths(cur, e.shiftKey ? 12 : 1);
    else if (e.key === 'Home') next = addDays(cur, -((cur.getDay() - fdow + 7) % 7));
    else if (e.key === 'End') next = addDays(cur, 6 - ((cur.getDay() - fdow + 7) % 7));
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickDay(cur); return; }
    else return;
    e.preventDefault();
    next = clampDate(next!, minDate, maxDate);
    if (!isSameMonth(next, viewDate())) updateView(next);
    requestAnimationFrame(() => {
      const selector = `.mkt-calendar__day[data-date="${next!.getFullYear()}-${next!.getMonth()}-${next!.getDate()}"]`;
      (body.querySelector(selector) as HTMLElement | null)?.focus();
    });
  });

  root.appendChild(header);
  root.appendChild(weekdayRow);
  root.appendChild(body);

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
