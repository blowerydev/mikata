import { signal, effect, renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { createIcon, ChevronLeft, ChevronRight } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { useDirection } from '../../theme';
import { getDecadeRange, isBefore, isAfter } from '../_internal/dates';
import type { YearPickerProps } from './YearPicker.types';
import './YearPicker.css';
import '../Calendar/Calendar.css';

export function YearPicker(userProps: YearPickerProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<YearPickerProps>('YearPicker') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as YearPickerProps;

  const value = props.value;
  const defaultValue = props.defaultValue ?? null;
  const date = props.date;
  const defaultDate = props.defaultDate;
  const onChange = props.onChange;
  const onDateChange = props.onDateChange;

  const direction = useDirection();

  const [decadeStart, setDecadeStart] = signal(
    getDecadeRange(
      (date ?? defaultDate ?? value ?? defaultValue ?? new Date()).getFullYear(),
    )[0],
  );
  const [selected, setSelected] = signal<Date | null>(value !== undefined ? value : defaultValue);

  function updateDecade(start: number) {
    setDecadeStart(start);
    onDateChange?.(new Date(start, 0, 1));
  }

  function yearDisabled(y: number): boolean {
    const minDate = props.minDate;
    const maxDate = props.maxDate;
    if (minDate && isBefore(new Date(y, 11, 31), minDate)) return true;
    if (maxDate && isAfter(new Date(y, 0, 1), maxDate)) return true;
    return false;
  }

  function pick(y: number) {
    if (yearDisabled(y)) return;
    const d = new Date(y, 0, 1);
    setSelected(d);
    onChange?.(d);
  }

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-year-picker', 'mkt-calendar', props.class, props.classNames?.root);
  });
  renderEffect(() => { root.dataset.size = props.size ?? 'md'; });

  const header = document.createElement('div');
  renderEffect(() => {
    header.className = mergeClasses('mkt-calendar__header', props.classNames?.header);
  });

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  renderEffect(() => {
    prevBtn.className = mergeClasses('mkt-calendar__header-control', props.classNames?.headerControl);
  });
  prevBtn.setAttribute('aria-label', 'Previous decade');
  prevBtn.appendChild(createIcon(ChevronLeft, { size: 16 }));
  prevBtn.addEventListener('click', () => updateDecade(decadeStart() - 10));

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
  nextBtn.setAttribute('aria-label', 'Next decade');
  nextBtn.appendChild(createIcon(ChevronRight, { size: 16 }));
  nextBtn.addEventListener('click', () => updateDecade(decadeStart() + 10));

  effect(() => {
    const rtl = direction() === 'rtl';
    header.innerHTML = '';
    if (rtl) { header.appendChild(nextBtn); header.appendChild(label); header.appendChild(prevBtn); }
    else { header.appendChild(prevBtn); header.appendChild(label); header.appendChild(nextBtn); }
  });

  effect(() => {
    const minDate = props.minDate;
    const maxDate = props.maxDate;
    label.textContent = `${decadeStart()} – ${decadeStart() + 9}`;
    prevBtn.disabled = !!(minDate && isBefore(new Date(decadeStart() - 1, 11, 31), minDate));
    nextBtn.disabled = !!(maxDate && isAfter(new Date(decadeStart() + 10, 0, 1), maxDate));
  });

  const grid = document.createElement('div');
  renderEffect(() => {
    grid.className = mergeClasses('mkt-year-picker__grid', props.classNames?.monthRow);
  });
  grid.setAttribute('role', 'grid');

  effect(() => {
    grid.innerHTML = '';
    const start = decadeStart();
    const sel = selected();
    const classNamesNow = props.classNames;
    // Show 12 years: one leading, a decade, one trailing (for visual 4x3 grid).
    for (let offset = -1; offset <= 10; offset++) {
      const y = start + offset;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = mergeClasses('mkt-year-picker__year', classNamesNow?.year);
      btn.textContent = String(y);
      btn.dataset.year = String(y);
      if (offset < 0 || offset > 9) btn.dataset.outside = '';
      if (sel && sel.getFullYear() === y) {
        btn.dataset.selected = '';
        btn.setAttribute('aria-selected', 'true');
      }
      if (yearDisabled(y)) btn.disabled = true;
      btn.addEventListener('click', () => pick(y));
      grid.appendChild(btn);
    }
  });

  grid.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!target.dataset.year) return;
    let y = +target.dataset.year;
    const rtl = direction() === 'rtl';
    const delta: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowUp: -3,
      ArrowDown: 3,
    };
    if (delta[e.key] !== undefined) y += delta[e.key];
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(y);
      return;
    } else return;
    e.preventDefault();
    const [newStart] = getDecadeRange(y);
    if (newStart !== decadeStart()) updateDecade(newStart);
    requestAnimationFrame(() => {
      (grid.querySelector(`[data-year="${y}"]`) as HTMLElement | null)?.focus();
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
