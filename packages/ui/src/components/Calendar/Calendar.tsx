import { signal, computed, effect } from '@mikata/reactivity';
import { createIcon, ChevronLeft, ChevronRight } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { useDirection } from '../../theme';
import {
  startOfMonth, addMonths, addDays, isSameDay, isSameMonth,
  isBefore, isAfter, isInRange, clampDate,
  getMonthMatrix, getWeekdayLabels, getFirstDayOfWeek,
} from '../_internal/dates';
import type { CalendarProps } from './Calendar.types';
import './Calendar.css';

export function Calendar(userProps: CalendarProps = {}): HTMLElement {
  const props = { ...useComponentDefaults<CalendarProps>('Calendar'), ...userProps };
  const {
    value,
    defaultValue = null,
    rangeValue,
    multipleValue,
    type = 'default',
    date,
    defaultDate,
    minDate,
    maxDate,
    excludeDate,
    locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    firstDayOfWeek,
    onChange,
    onDateChange,
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

  // --- State -----------------------------------------------------------
  const initialView = startOfMonth(date ?? defaultDate ?? value ?? (rangeValue?.[0] ?? multipleValue?.[0] ?? new Date()));
  const [viewDate, setViewDate] = signal<Date>(initialView);

  const initialSingle = value !== undefined ? value : defaultValue;
  const [selected, setSelected] = signal<Date | null>(initialSingle ?? null);
  const [multi, setMulti] = signal<Date[]>(multipleValue ?? []);
  const [range, setRange] = signal<[Date | null, Date | null]>(rangeValue ?? [null, null]);
  const [hover, setHover] = signal<Date | null>(null);

  function dateDisabled(d: Date): boolean {
    if (minDate && isBefore(d, minDate)) return true;
    if (maxDate && isAfter(d, maxDate)) return true;
    if (excludeDate?.(d)) return true;
    return false;
  }

  function handleSelect(d: Date) {
    if (dateDisabled(d)) return;
    if (type === 'default') {
      setSelected(d);
      onChange?.(d);
    } else if (type === 'multiple') {
      const cur = multi();
      const idx = cur.findIndex((x) => isSameDay(x, d));
      const next = idx === -1 ? [...cur, d] : cur.filter((_, i) => i !== idx);
      setMulti(next);
      onChange?.(next);
    } else {
      const [s, e] = range();
      if (!s || (s && e)) {
        const next: [Date | null, Date | null] = [d, null];
        setRange(next);
        onChange?.(next);
      } else {
        const next: [Date, Date] = isBefore(d, s) ? [d, s] : [s, d];
        setRange(next);
        onChange?.(next);
      }
    }
  }

  function updateView(next: Date) {
    setViewDate(startOfMonth(next));
    onDateChange?.(next);
  }

  // --- DOM -------------------------------------------------------------
  const root = document.createElement('div');
  root.className = mergeClasses('mkt-calendar', className, classNames?.root);
  root.dataset.size = size;

  // Header
  const header = document.createElement('div');
  header.className = mergeClasses('mkt-calendar__header', classNames?.header);

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = mergeClasses('mkt-calendar__header-control', classNames?.headerControl);
  prevBtn.setAttribute('aria-label', 'Previous month');
  prevBtn.appendChild(createIcon(ChevronLeft, { size: 16 }));
  prevBtn.addEventListener('click', () => updateView(addMonths(viewDate(), -1)));

  const label = document.createElement('button');
  label.type = 'button';
  label.className = mergeClasses('mkt-calendar__header-label', classNames?.headerLabel);
  label.setAttribute('aria-live', 'polite');

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = mergeClasses('mkt-calendar__header-control', classNames?.headerControl);
  nextBtn.setAttribute('aria-label', 'Next month');
  nextBtn.appendChild(createIcon(ChevronRight, { size: 16 }));
  nextBtn.addEventListener('click', () => updateView(addMonths(viewDate(), 1)));

  // Visually swap prev/next in RTL so arrows point the direction they travel.
  effect(() => {
    const rtl = direction() === 'rtl';
    header.innerHTML = '';
    if (rtl) {
      header.appendChild(nextBtn);
      header.appendChild(label);
      header.appendChild(prevBtn);
    } else {
      header.appendChild(prevBtn);
      header.appendChild(label);
      header.appendChild(nextBtn);
    }
  });

  effect(() => {
    label.textContent = monthFormatter.format(viewDate());
    // Disable controls if min/max would prevent crossing the boundary.
    const prevMonth = addMonths(viewDate(), -1);
    const nextMonth = addMonths(viewDate(), 1);
    prevBtn.disabled = !!(minDate && isBefore(addDays(startOfMonth(viewDate()), -1), minDate));
    nextBtn.disabled = !!(maxDate && isAfter(startOfMonth(nextMonth), maxDate));
    void prevMonth;
  });

  // Weekday row
  const weekdayRow = document.createElement('div');
  weekdayRow.className = mergeClasses('mkt-calendar__grid', 'mkt-calendar__weekday-row', classNames?.weekdayRow);
  if (hideWeekdays) weekdayRow.style.display = 'none';

  effect(() => {
    weekdayRow.innerHTML = '';
    const labels = getWeekdayLabels(locale, fdow, 'short');
    for (const l of labels) {
      const el = document.createElement('span');
      el.className = mergeClasses('mkt-calendar__weekday', classNames?.weekday);
      el.textContent = l;
      weekdayRow.appendChild(el);
    }
  });

  // Day grid
  const grid = document.createElement('div');
  grid.className = mergeClasses('mkt-calendar__grid', classNames?.monthRow);
  grid.setAttribute('role', 'grid');

  // Selection predicates
  const isSelectedCell = (d: Date): boolean => {
    if (type === 'default') {
      const s = selected();
      return !!s && isSameDay(s, d);
    }
    if (type === 'multiple') return multi().some((x) => isSameDay(x, d));
    const [s, e] = range();
    return !!((s && isSameDay(s, d)) || (e && isSameDay(e, d)));
  };

  const isInSelectedRange = (d: Date): boolean => {
    if (type !== 'range') return false;
    const [s, e] = range();
    if (s && e) return isInRange(d, s, e);
    if (s && hover()) return isInRange(d, s, hover()!);
    return false;
  };

  effect(() => {
    const matrix = getMonthMatrix(viewDate(), fdow);
    const today = new Date();
    const viewMonth = viewDate();
    grid.innerHTML = '';

    for (const row of matrix) {
      for (const day of row) {
        const inMonth = isSameMonth(day, viewMonth);
        if (!inMonth && hideOutsideDates) {
          const placeholder = document.createElement('span');
          placeholder.className = 'mkt-calendar__day';
          placeholder.setAttribute('aria-hidden', 'true');
          placeholder.style.visibility = 'hidden';
          grid.appendChild(placeholder);
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
        if (isSelectedCell(day)) {
          btn.dataset.selected = '';
          btn.setAttribute('aria-selected', 'true');
        }
        if (isInSelectedRange(day)) btn.dataset.inRange = '';
        if (type === 'range') {
          const [s, e] = range();
          if (s && isSameDay(s, day)) btn.dataset.rangeStart = '';
          if (e && isSameDay(e, day)) btn.dataset.rangeEnd = '';
        }
        if (dateDisabled(day)) btn.disabled = true;

        btn.addEventListener('click', () => handleSelect(day));
        if (type === 'range') {
          btn.addEventListener('mouseenter', () => setHover(day));
          btn.addEventListener('mouseleave', () => setHover(null));
        }

        grid.appendChild(btn);
      }
    }
  });

  // Keyboard navigation
  grid.addEventListener('keydown', (e: KeyboardEvent) => {
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
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(cur);
      return;
    } else return;

    e.preventDefault();
    next = clampDate(next!, minDate, maxDate);
    if (!isSameMonth(next, viewDate())) updateView(next);
    requestAnimationFrame(() => {
      const selector = `.mkt-calendar__day[data-date="${next!.getFullYear()}-${next!.getMonth()}-${next!.getDate()}"]`;
      (grid.querySelector(selector) as HTMLElement | null)?.focus();
    });
  });

  root.appendChild(header);
  root.appendChild(weekdayRow);
  root.appendChild(grid);

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
