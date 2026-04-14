import { signal, effect, renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { createIcon, ChevronLeft, ChevronRight } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { useDirection } from '../../theme';
import { getMonthLabels, isBefore, isAfter } from '../_internal/dates';
import type { MonthPickerProps } from './MonthPicker.types';
import './MonthPicker.css';
import '../Calendar/Calendar.css';

export function MonthPicker(userProps: MonthPickerProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<MonthPickerProps>('MonthPicker') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as MonthPickerProps;

  const value = props.value;
  const defaultValue = props.defaultValue ?? null;
  const date = props.date;
  const defaultDate = props.defaultDate;
  const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const onChange = props.onChange;
  const onDateChange = props.onDateChange;

  const direction = useDirection();

  const [year, setYear] = signal(
    (date ?? defaultDate ?? value ?? defaultValue ?? new Date()).getFullYear(),
  );
  const [selected, setSelected] = signal<Date | null>(value !== undefined ? value : defaultValue);

  function updateYear(next: number) {
    setYear(next);
    onDateChange?.(new Date(next, 0, 1));
  }

  function monthDisabled(y: number, m: number): boolean {
    const minDate = props.minDate;
    const maxDate = props.maxDate;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    if (minDate && isBefore(end, minDate)) return true;
    if (maxDate && isAfter(start, maxDate)) return true;
    return false;
  }

  function pick(y: number, m: number) {
    if (monthDisabled(y, m)) return;
    const d = new Date(y, m, 1);
    setSelected(d);
    onChange?.(d);
  }

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-month-picker', 'mkt-calendar', props.class, props.classNames?.root);
  });
  renderEffect(() => { root.dataset.size = props.size ?? 'md'; });

  // Header - year nav
  const header = document.createElement('div');
  renderEffect(() => {
    header.className = mergeClasses('mkt-calendar__header', props.classNames?.header);
  });

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  renderEffect(() => {
    prevBtn.className = mergeClasses('mkt-calendar__header-control', props.classNames?.headerControl);
  });
  prevBtn.setAttribute('aria-label', 'Previous year');
  prevBtn.appendChild(createIcon(ChevronLeft, { size: 16 }));
  prevBtn.addEventListener('click', () => updateYear(year() - 1));

  const label = document.createElement('button');
  label.type = 'button';
  renderEffect(() => {
    label.className = mergeClasses('mkt-calendar__header-label', props.classNames?.headerLabel);
  });

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  renderEffect(() => {
    nextBtn.className = mergeClasses('mkt-calendar__header-control', props.classNames?.headerControl);
  });
  nextBtn.setAttribute('aria-label', 'Next year');
  nextBtn.appendChild(createIcon(ChevronRight, { size: 16 }));
  nextBtn.addEventListener('click', () => updateYear(year() + 1));

  effect(() => {
    const rtl = direction() === 'rtl';
    header.innerHTML = '';
    if (rtl) { header.appendChild(nextBtn); header.appendChild(label); header.appendChild(prevBtn); }
    else { header.appendChild(prevBtn); header.appendChild(label); header.appendChild(nextBtn); }
  });

  effect(() => {
    const minDate = props.minDate;
    const maxDate = props.maxDate;
    label.textContent = String(year());
    prevBtn.disabled = !!(minDate && isBefore(new Date(year() - 1, 11, 31), minDate));
    nextBtn.disabled = !!(maxDate && isAfter(new Date(year() + 1, 0, 1), maxDate));
  });

  // Month grid
  const grid = document.createElement('div');
  renderEffect(() => {
    grid.className = mergeClasses('mkt-month-picker__grid', props.classNames?.monthRow);
  });
  grid.setAttribute('role', 'grid');

  effect(() => {
    grid.innerHTML = '';
    const labels = getMonthLabels(locale, 'short');
    const y = year();
    const sel = selected();
    const classNamesNow = props.classNames;
    for (let m = 0; m < 12; m++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = mergeClasses('mkt-month-picker__month', classNamesNow?.month);
      btn.textContent = labels[m];
      btn.dataset.month = `${y}-${m}`;
      if (sel && sel.getFullYear() === y && sel.getMonth() === m) {
        btn.dataset.selected = '';
        btn.setAttribute('aria-selected', 'true');
      }
      if (monthDisabled(y, m)) btn.disabled = true;
      btn.addEventListener('click', () => pick(y, m));
      grid.appendChild(btn);
    }
  });

  grid.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!target.dataset.month) return;
    const [yStr, mStr] = target.dataset.month.split('-');
    let y = +yStr, m = +mStr;
    const rtl = direction() === 'rtl';
    const delta: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowUp: -3,
      ArrowDown: 3,
    };
    if (delta[e.key] !== undefined) {
      m += delta[e.key];
      while (m < 0) { m += 12; y--; }
      while (m > 11) { m -= 12; y++; }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(y, m);
      return;
    } else if (e.key === 'Home') m = 0;
    else if (e.key === 'End') m = 11;
    else return;
    e.preventDefault();
    if (y !== year()) updateYear(y);
    requestAnimationFrame(() => {
      (grid.querySelector(`[data-month="${y}-${m}"]`) as HTMLElement | null)?.focus();
    });
  });

  root.appendChild(header);
  root.appendChild(grid);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
