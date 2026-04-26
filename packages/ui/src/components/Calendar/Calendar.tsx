import { signal, effect, renderEffect, getCurrentScope, onCleanup } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { createIcon, ChevronLeft, ChevronRight } from '../../internal/icons';
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
  const props = _mergeProps(
    useComponentDefaults<CalendarProps>('Calendar') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as CalendarProps;

  const value = props.value;
  const defaultValue = props.defaultValue ?? null;
  const rangeValue = props.rangeValue;
  const multipleValue = props.multipleValue;
  const type = props.type ?? 'default';
  const date = props.date;
  const defaultDate = props.defaultDate;
  const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const firstDayOfWeek = props.firstDayOfWeek;
  const onChange = props.onChange;
  const onDateChange = props.onDateChange;
  const hideWeekdays = props.hideWeekdays ?? false;
  const hideOutsideDates = props.hideOutsideDates ?? false;

  const fdow = firstDayOfWeek ?? getFirstDayOfWeek(locale);
  const direction = useDirection();
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });

  const initialView = startOfMonth(date ?? defaultDate ?? value ?? (rangeValue?.[0] ?? multipleValue?.[0] ?? new Date()));
  const [viewDate, setViewDate] = signal<Date>(initialView);

  const initialSingle = value !== undefined ? value : defaultValue;
  const [selected, setSelected] = signal<Date | null>(initialSingle ?? null);
  const [multi, setMulti] = signal<Date[]>(multipleValue ?? []);
  const [range, setRange] = signal<[Date | null, Date | null]>(rangeValue ?? [null, null]);
  const [hover, setHover] = signal<Date | null>(null);

  function dateDisabled(d: Date): boolean {
    const minDate = props.minDate;
    const maxDate = props.maxDate;
    if (minDate && isBefore(d, minDate)) return true;
    if (maxDate && isAfter(d, maxDate)) return true;
    if (props.excludeDate?.(d)) return true;
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

  const dayButtons: { day: Date; btn: HTMLButtonElement }[] = [];
  let gridEl!: HTMLDivElement;

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-calendar', props.class, props.classNames?.root);
    });
    renderEffect(() => { root.dataset.size = props.size ?? 'md'; });

    adoptElement<HTMLDivElement>('div', (header) => {
      renderEffect(() => {
        header.className = mergeClasses('mkt-calendar__header', props.classNames?.header);
      });

      // Prev/label/next buttons are built imperatively and re-ordered
      // via innerHTML swap below when direction flips — adoption-cursor
      // semantics don't work cleanly when the child order is reactive.
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      renderEffect(() => {
        prevBtn.className = mergeClasses('mkt-calendar__header-control', props.classNames?.headerControl);
      });
      prevBtn.setAttribute('aria-label', 'Previous month');
      prevBtn.appendChild(createIcon(ChevronLeft, { size: 16 }));
      const handlePrevClick = () => updateView(addMonths(viewDate(), -1));
      prevBtn.addEventListener('click', handlePrevClick);

      const label = document.createElement('button');
      label.type = 'button';
      renderEffect(() => {
        label.className = mergeClasses('mkt-calendar__header-label', props.classNames?.headerLabel);
      });
      label.setAttribute('aria-live', 'polite');

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      renderEffect(() => {
        nextBtn.className = mergeClasses('mkt-calendar__header-control', props.classNames?.headerControl);
      });
      nextBtn.setAttribute('aria-label', 'Next month');
      nextBtn.appendChild(createIcon(ChevronRight, { size: 16 }));
      const handleNextClick = () => updateView(addMonths(viewDate(), 1));
      nextBtn.addEventListener('click', handleNextClick);

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
        const minDate = props.minDate;
        const maxDate = props.maxDate;
        const nextMonth = addMonths(viewDate(), 1);
        prevBtn.disabled = !!(minDate && isBefore(addDays(startOfMonth(viewDate()), -1), minDate));
        nextBtn.disabled = !!(maxDate && isAfter(startOfMonth(nextMonth), maxDate));
      });

      if (getCurrentScope()) {
        onCleanup(() => {
          prevBtn.removeEventListener('click', handlePrevClick);
          nextBtn.removeEventListener('click', handleNextClick);
        });
      }
    });

    adoptElement<HTMLDivElement>('div', (weekdayRow) => {
      renderEffect(() => {
        weekdayRow.className = mergeClasses('mkt-calendar__grid', 'mkt-calendar__weekday-row', props.classNames?.weekdayRow);
      });
      if (hideWeekdays) weekdayRow.style.display = 'none';

      effect(() => {
        weekdayRow.innerHTML = '';
        const labels = getWeekdayLabels(locale, fdow, 'short');
        for (const l of labels) {
          const el = document.createElement('span');
          const classNamesNow = props.classNames;
          el.className = mergeClasses('mkt-calendar__weekday', classNamesNow?.weekday);
          el.textContent = l;
          weekdayRow.appendChild(el);
        }
      });
    });

    adoptElement<HTMLDivElement>('div', (grid) => {
      gridEl = grid;
      renderEffect(() => {
        grid.className = mergeClasses('mkt-calendar__grid', props.classNames?.monthRow);
      });
      grid.setAttribute('role', 'grid');

      // Rebuilt only when the visible month changes. Keeping button
      // elements stable across selection/hover updates prevents a
      // real-browser flicker where rebuilding the grid during hover
      // caused mouseleave-on-removal to race with clicks.
      effect(() => {
        const matrix = getMonthMatrix(viewDate(), fdow);
        const today = new Date();
        const viewMonth = viewDate();
        grid.innerHTML = '';
        dayButtons.length = 0;

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
            btn.className = mergeClasses('mkt-calendar__day', props.classNames?.day);
            btn.textContent = String(day.getDate());
            btn.dataset.date = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;

            if (!inMonth) btn.dataset.outside = '';
            if (isSameDay(day, today)) btn.dataset.today = '';
            if (day.getDay() === 0 || day.getDay() === 6) btn.dataset.weekend = '';
            if (dateDisabled(day)) btn.disabled = true;

            grid.appendChild(btn);
            dayButtons.push({ day, btn });
          }
        }
      });

      // State overlay: toggles attributes on the stable button set
      // without replacing any DOM.
      effect(() => {
        for (const { day, btn } of dayButtons) {
          if (isSelectedCell(day)) {
            btn.dataset.selected = '';
            btn.setAttribute('aria-selected', 'true');
          } else {
            delete btn.dataset.selected;
            btn.removeAttribute('aria-selected');
          }
          if (isInSelectedRange(day)) btn.dataset.inRange = '';
          else delete btn.dataset.inRange;
          if (type === 'range') {
            const [s, e] = range();
            if (s && isSameDay(s, day)) btn.dataset.rangeStart = '';
            else delete btn.dataset.rangeStart;
            if (e && isSameDay(e, day)) btn.dataset.rangeEnd = '';
            else delete btn.dataset.rangeEnd;
          }
        }
      });

      const getDayFromTarget = (target: EventTarget | null): Date | null => {
        const btn = target instanceof Element
          ? target.closest<HTMLButtonElement>('.mkt-calendar__day')
          : null;
        if (!btn || btn.disabled || !grid.contains(btn)) return null;
        const entry = dayButtons.find((item) => item.btn === btn);
        return entry?.day ?? null;
      };

      const handleClick = (e: MouseEvent) => {
        const day = getDayFromTarget(e.target);
        if (day) handleSelect(day);
      };

      const handleMouseEnter = (e: MouseEvent) => {
        if (type !== 'range') return;
        const day = getDayFromTarget(e.target);
        if (day) setHover(day);
      };

      const handleMouseLeave = (e: MouseEvent) => {
        if (type !== 'range') return;
        if (getDayFromTarget(e.target)) setHover(null);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
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
        next = clampDate(next!, props.minDate, props.maxDate);
        if (!isSameMonth(next, viewDate())) updateView(next);
        requestAnimationFrame(() => {
          const selector = `.mkt-calendar__day[data-date="${next!.getFullYear()}-${next!.getMonth()}-${next!.getDate()}"]`;
          (gridEl.querySelector(selector) as HTMLElement | null)?.focus();
        });
      };

      grid.addEventListener('click', handleClick);
      grid.addEventListener('mouseenter', handleMouseEnter, true);
      grid.addEventListener('mouseleave', handleMouseLeave, true);
      grid.addEventListener('keydown', handleKeyDown);
      if (getCurrentScope()) {
        onCleanup(() => {
          grid.removeEventListener('click', handleClick);
          grid.removeEventListener('mouseenter', handleMouseEnter, true);
          grid.removeEventListener('mouseleave', handleMouseLeave, true);
          grid.removeEventListener('keydown', handleKeyDown);
        });
      }
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
