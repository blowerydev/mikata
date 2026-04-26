import { signal, effect, renderEffect, getCurrentScope, onCleanup } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { createIcon, ChevronLeft, ChevronRight } from '../../internal/icons';
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
  const props = _mergeProps(
    useComponentDefaults<DatePickerProps>('DatePicker') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as DatePickerProps;

  const type = props.type ?? 'default';
  const value = props.value;
  const defaultValue = props.defaultValue ?? null;
  const defaultLevel = props.defaultLevel ?? 'day';
  const maxLevel = props.maxLevel ?? 'year';
  const date = props.date;
  const defaultDate = props.defaultDate;
  const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const firstDayOfWeek = props.firstDayOfWeek;
  const onChange = props.onChange;
  const onDateChange = props.onDateChange;
  const onLevelChange = props.onLevelChange;
  const hideWeekdays = props.hideWeekdays ?? false;
  const hideOutsideDates = props.hideOutsideDates ?? false;

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
    const minDate = props.minDate;
    const maxDate = props.maxDate;
    if (minDate && isBefore(d, minDate)) return true;
    if (maxDate && isAfter(d, maxDate)) return true;
    if (props.excludeDate?.(d)) return true;
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

  // Body ref for keyboard nav querying + imperative rebuilds.
  let bodyEl!: HTMLDivElement;

  // Keep button elements stable across selection/hover updates so a real-browser
  // mouseleave-on-removal doesn't race with the click when selecting the end
  // date in range mode.
  let dayButtons: { day: Date; btn: HTMLButtonElement }[] = [];

  function renderDayGrid() {
    const classNamesNow = props.classNames;
    bodyEl.className = mergeClasses('mkt-calendar__grid', classNamesNow?.monthRow);
    bodyEl.innerHTML = '';
    dayButtons = [];
    const matrix = getMonthMatrix(viewDate(), fdow);
    const today = new Date();
    const viewMonth = viewDate();

    for (const row of matrix) {
      for (const day of row) {
        const inMonth = isSameMonth(day, viewMonth);
        if (!inMonth && hideOutsideDates) {
          const ph = document.createElement('span');
          ph.className = 'mkt-calendar__day';
          ph.style.visibility = 'hidden';
          bodyEl.appendChild(ph);
          continue;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = mergeClasses('mkt-calendar__day', classNamesNow?.day);
        btn.textContent = String(day.getDate());
        btn.dataset.date = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
        if (!inMonth) btn.dataset.outside = '';
        if (isSameDay(day, today)) btn.dataset.today = '';
        if (day.getDay() === 0 || day.getDay() === 6) btn.dataset.weekend = '';
        if (dateDisabled(day)) btn.disabled = true;
        bodyEl.appendChild(btn);
        dayButtons.push({ day, btn });
      }
    }
  }

  function applyDayState() {
    const v = selected();
    const rangeTuple = type === 'range' && Array.isArray(v) ? (v as [Date | null, Date | null]) : null;
    for (const { day, btn } of dayButtons) {
      if (isSelectedDay(day)) {
        btn.dataset.selected = '';
        btn.setAttribute('aria-selected', 'true');
      } else {
        delete btn.dataset.selected;
        btn.removeAttribute('aria-selected');
      }
      if (isInSelectedRange(day)) btn.dataset.inRange = '';
      else delete btn.dataset.inRange;
      if (rangeTuple) {
        if (rangeTuple[0] && isSameDay(rangeTuple[0], day)) btn.dataset.rangeStart = '';
        else delete btn.dataset.rangeStart;
        if (rangeTuple[1] && isSameDay(rangeTuple[1], day)) btn.dataset.rangeEnd = '';
        else delete btn.dataset.rangeEnd;
      }
    }
  }

  function renderMonthGrid() {
    bodyEl.className = mergeClasses('mkt-month-picker__grid', props.classNames?.monthRow);
    bodyEl.innerHTML = '';
    const labels = getMonthLabels(locale, 'short');
    const y = viewDate().getFullYear();
    const minDate = props.minDate;
    const maxDate = props.maxDate;
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
      bodyEl.appendChild(btn);
    }
  }

  function renderYearGrid() {
    bodyEl.className = mergeClasses('mkt-year-picker__grid', props.classNames?.monthRow);
    bodyEl.innerHTML = '';
    const [start] = getDecadeRange(viewDate().getFullYear());
    const minDate = props.minDate;
    const maxDate = props.maxDate;
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
      bodyEl.appendChild(btn);
    }
  }

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-calendar', props.class, props.classNames?.root);
    });
    renderEffect(() => { root.dataset.size = props.size ?? 'md'; });

    adoptElement<HTMLDivElement>('div', (header) => {
      renderEffect(() => {
        header.className = mergeClasses('mkt-calendar__header', props.classNames?.header);
      });

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      renderEffect(() => {
        prevBtn.className = mergeClasses('mkt-calendar__header-control', props.classNames?.headerControl);
      });
      prevBtn.appendChild(createIcon(ChevronLeft, { size: 16 }));

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
      nextBtn.appendChild(createIcon(ChevronRight, { size: 16 }));

      effect(() => {
        const rtl = direction() === 'rtl';
        header.innerHTML = '';
        if (rtl) { header.appendChild(nextBtn); header.appendChild(label); header.appendChild(prevBtn); }
        else { header.appendChild(prevBtn); header.appendChild(label); header.appendChild(nextBtn); }
      });

      const handlePrevClick = () => {
        const l = level();
        if (l === 'day') updateView(addMonths(viewDate(), -1));
        else if (l === 'month') updateView(new Date(viewDate().getFullYear() - 1, viewDate().getMonth(), 1));
        else updateView(new Date(viewDate().getFullYear() - 10, 0, 1));
      };
      const handleNextClick = () => {
        const l = level();
        if (l === 'day') updateView(addMonths(viewDate(), 1));
        else if (l === 'month') updateView(new Date(viewDate().getFullYear() + 1, viewDate().getMonth(), 1));
        else updateView(new Date(viewDate().getFullYear() + 10, 0, 1));
      };

      const handleLabelClick = () => {
        const next = canClimb(level());
        if (next) changeLevel(next);
      };

      prevBtn.addEventListener('click', handlePrevClick);
      nextBtn.addEventListener('click', handleNextClick);
      label.addEventListener('click', handleLabelClick);

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
          label.textContent = `${ds} - ${de}`;
          prevBtn.setAttribute('aria-label', 'Previous decade');
          nextBtn.setAttribute('aria-label', 'Next decade');
        }
        label.disabled = canClimb(l) === null;
      });

      if (getCurrentScope()) {
        onCleanup(() => {
          prevBtn.removeEventListener('click', handlePrevClick);
          nextBtn.removeEventListener('click', handleNextClick);
          label.removeEventListener('click', handleLabelClick);
        });
      }
    });

    adoptElement<HTMLDivElement>('div', (weekdayRow) => {
      renderEffect(() => {
        weekdayRow.className = mergeClasses('mkt-calendar__grid', props.classNames?.weekdayRow);
      });

      effect(() => {
        const show = level() === 'day' && !hideWeekdays;
        weekdayRow.style.display = show ? '' : 'none';
        if (!show) return;
        weekdayRow.innerHTML = '';
        const classNamesNow = props.classNames;
        for (const l of getWeekdayLabels(locale, fdow, 'short')) {
          const el = document.createElement('span');
          el.className = mergeClasses('mkt-calendar__weekday', classNamesNow?.weekday);
          el.textContent = l;
          weekdayRow.appendChild(el);
        }
      });
    });

    adoptElement<HTMLDivElement>('div', (body) => {
      bodyEl = body;
      body.setAttribute('role', 'grid');

      // Structure: depends on level + viewDate only. Day buttons stay mounted
      // across selection/hover changes so clicks don't race with DOM removal.
      effect(() => {
        const l = level();
        viewDate();
        if (l === 'day') renderDayGrid();
        else if (l === 'month') renderMonthGrid();
        else renderYearGrid();
      });

      effect(() => {
        selected(); hover();
        if (level() === 'day') applyDayState();
      });

      const getDayFromTarget = (target: EventTarget | null): Date | null => {
        const btn = target instanceof Element
          ? target.closest<HTMLButtonElement>('.mkt-calendar__day')
          : null;
        if (!btn || btn.disabled || !body.contains(btn)) return null;
        const entry = dayButtons.find((item) => item.btn === btn);
        return entry?.day ?? null;
      };

      const handleClick = (e: MouseEvent) => {
        const target = e.target instanceof Element ? e.target : null;
        if (!target) return;

        const day = level() === 'day' ? getDayFromTarget(target) : null;
        if (day) {
          pickDay(day);
          return;
        }

        const monthButton = target.closest<HTMLButtonElement>('.mkt-month-picker__month');
        if (monthButton && !monthButton.disabled && body.contains(monthButton)) {
          const [year, month] = (monthButton.dataset.month ?? '').split('-').map(Number);
          if (!Number.isNaN(year) && !Number.isNaN(month)) {
            updateView(new Date(year, month, 1));
            changeLevel('day');
          }
          return;
        }

        const yearButton = target.closest<HTMLButtonElement>('.mkt-year-picker__year');
        if (yearButton && !yearButton.disabled && body.contains(yearButton)) {
          const y = Number(yearButton.dataset.year);
          if (!Number.isNaN(y)) {
            updateView(new Date(y, viewDate().getMonth(), 1));
            changeLevel('month');
          }
        }
      };

      const handleMouseEnter = (e: MouseEvent) => {
        if (type !== 'range' || level() !== 'day') return;
        const day = getDayFromTarget(e.target);
        if (day) setHover(day);
      };

      const handleMouseLeave = (e: MouseEvent) => {
        if (type !== 'range' || level() !== 'day') return;
        if (getDayFromTarget(e.target)) setHover(null);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
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
        next = clampDate(next!, props.minDate, props.maxDate);
        if (!isSameMonth(next, viewDate())) updateView(next);
        requestAnimationFrame(() => {
          const selector = `.mkt-calendar__day[data-date="${next!.getFullYear()}-${next!.getMonth()}-${next!.getDate()}"]`;
          (body.querySelector(selector) as HTMLElement | null)?.focus();
        });
      };

      body.addEventListener('click', handleClick);
      body.addEventListener('mouseenter', handleMouseEnter, true);
      body.addEventListener('mouseleave', handleMouseLeave, true);
      body.addEventListener('keydown', handleKeyDown);
      if (getCurrentScope()) {
        onCleanup(() => {
          body.removeEventListener('click', handleClick);
          body.removeEventListener('mouseenter', handleMouseEnter, true);
          body.removeEventListener('mouseleave', handleMouseLeave, true);
          body.removeEventListener('keydown', handleKeyDown);
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
