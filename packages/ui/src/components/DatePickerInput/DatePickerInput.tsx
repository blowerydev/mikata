import { signal, effect } from '@mikata/reactivity';
import { createRef } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { onClickOutside } from '../../utils/on-click-outside';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import { DatePicker } from '../DatePicker';
import { MonthPicker } from '../MonthPicker';
import { YearPicker } from '../YearPicker';
import { formatDisplayDate } from '../_internal/dates';
import type {
  DatePickerInputProps, MonthPickerInputProps, YearPickerInputProps,
} from './DatePickerInput.types';
import './DatePickerInput.css';

function formatDate(d: Date, locale: string, fmt?: Intl.DateTimeFormatOptions): string {
  return formatDisplayDate(d, locale, fmt);
}

function displayFor(
  value: Date | Date[] | [Date | null, Date | null] | null,
  type: 'default' | 'multiple' | 'range',
  locale: string,
  fmt?: Intl.DateTimeFormatOptions,
): string {
  if (value == null) return '';
  if (type === 'default' && value instanceof Date) return formatDate(value, locale, fmt);
  if (type === 'multiple' && Array.isArray(value)) {
    return (value as Date[]).map((d) => formatDate(d, locale, fmt)).join(', ');
  }
  if (type === 'range' && Array.isArray(value)) {
    const [s, e] = value as [Date | null, Date | null];
    if (s && e) return `${formatDate(s, locale, fmt)} – ${formatDate(e, locale, fmt)}`;
    if (s) return `${formatDate(s, locale, fmt)} – …`;
  }
  return '';
}

/**
 * DatePickerInput - button trigger + DatePicker dropdown. Supports the same
 * `type` modes as DatePicker (default / multiple / range).
 */
export function DatePickerInput(userProps: DatePickerInputProps = {}): HTMLDivElement {
  const props = { ...useComponentDefaults<DatePickerInputProps>('DatePickerInput'), ...userProps };
  const {
    type = 'default',
    value,
    defaultValue = null,
    label,
    description,
    error,
    required,
    placeholder = 'Pick a date',
    disabled,
    minDate,
    maxDate,
    excludeDate,
    locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    firstDayOfWeek,
    closeOnChange = true,
    valueFormat,
    size = 'md',
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('date-picker-input');
  const [selected, setSelected] = signal<Date | Date[] | [Date | null, Date | null] | null>(
    value !== undefined ? value : defaultValue,
  );
  const [open, setOpen] = signal(false);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = id;
  trigger.className = mergeClasses('mkt-picker-input__trigger', classNames?.trigger);
  trigger.dataset.size = size;
  if (disabled) trigger.disabled = true;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', () => { if (!disabled) setOpen(!open()); });

  effect(() => {
    const str = displayFor(selected(), type, locale, valueFormat);
    trigger.replaceChildren();
    if (str) {
      trigger.textContent = str;
    } else {
      const ph = document.createElement('span');
      ph.className = mergeClasses('mkt-picker-input__placeholder', classNames?.placeholder);
      ph.textContent = placeholder;
      trigger.appendChild(ph);
    }
    trigger.setAttribute('aria-expanded', String(open()));
  });

  const dropdown = document.createElement('div');
  dropdown.className = mergeClasses('mkt-picker-input__dropdown', classNames?.dropdown);
  dropdown.hidden = true;

  const picker = DatePicker({
    type,
    value: selected() ?? undefined,
    minDate,
    maxDate,
    excludeDate,
    locale,
    firstDayOfWeek,
    size,
    onChange: (v) => {
      setSelected(v);
      onChange?.(v);
      if (type === 'default' && closeOnChange) setOpen(false);
    },
  });
  dropdown.appendChild(picker);

  const container = document.createElement('div');
  container.className = mergeClasses('mkt-picker-input', classNames?.root);
  container.appendChild(trigger);
  container.appendChild(dropdown);

  effect(() => { dropdown.hidden = !open(); });

  const containerRef = createRef<HTMLElement>();
  containerRef(container);
  onClickOutside(containerRef, () => setOpen(false));

  if (ref) {
    if (typeof ref === 'function') ref(container);
    else (ref as { current: HTMLElement | null }).current = container;
  }

  return InputWrapper({
    id,
    label,
    description,
    error,
    required,
    size,
    class: className,
    classNames,
    children: container,
  });
}

/** Button trigger + MonthPicker dropdown. */
export function MonthPickerInput(userProps: MonthPickerInputProps = {}): HTMLDivElement {
  const props = { ...useComponentDefaults<MonthPickerInputProps>('MonthPickerInput'), ...userProps };
  const {
    value, defaultValue = null, label, description, error, required,
    placeholder = 'Pick a month', disabled, minDate, maxDate, excludeDate,
    locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    closeOnChange = true, valueFormat = { year: 'numeric', month: 'long' },
    size = 'md', onChange, classNames, class: className, ref,
  } = props;

  const id = uniqueId('month-picker-input');
  const [selected, setSelected] = signal<Date | null>(value !== undefined ? value : defaultValue);
  const [open, setOpen] = signal(false);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = id;
  trigger.className = mergeClasses('mkt-picker-input__trigger', classNames?.trigger);
  trigger.dataset.size = size;
  if (disabled) trigger.disabled = true;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', () => { if (!disabled) setOpen(!open()); });

  effect(() => {
    const v = selected();
    trigger.replaceChildren();
    if (v) {
      trigger.textContent = formatDate(v, locale, valueFormat);
    } else {
      const ph = document.createElement('span');
      ph.className = 'mkt-picker-input__placeholder';
      ph.textContent = placeholder;
      trigger.appendChild(ph);
    }
    trigger.setAttribute('aria-expanded', String(open()));
  });

  const dropdown = document.createElement('div');
  dropdown.className = mergeClasses('mkt-picker-input__dropdown', classNames?.dropdown);
  dropdown.hidden = true;

  void excludeDate; // reserved for future; MonthPicker doesn't consume it.

  const picker = MonthPicker({
    value: selected() ?? undefined,
    minDate, maxDate, locale, size,
    onChange: (v) => {
      setSelected(v);
      onChange?.(v);
      if (closeOnChange) setOpen(false);
    },
  });
  dropdown.appendChild(picker);

  const container = document.createElement('div');
  container.className = mergeClasses('mkt-picker-input', classNames?.root);
  container.appendChild(trigger);
  container.appendChild(dropdown);

  effect(() => { dropdown.hidden = !open(); });
  const containerRef = createRef<HTMLElement>();
  containerRef(container);
  onClickOutside(containerRef, () => setOpen(false));

  if (ref) {
    if (typeof ref === 'function') ref(container);
    else (ref as { current: HTMLElement | null }).current = container;
  }

  return InputWrapper({
    id, label, description, error, required, size,
    class: className, classNames, children: container,
  });
}

/** Button trigger + YearPicker dropdown. */
export function YearPickerInput(userProps: YearPickerInputProps = {}): HTMLDivElement {
  const props = { ...useComponentDefaults<YearPickerInputProps>('YearPickerInput'), ...userProps };
  const {
    value, defaultValue = null, label, description, error, required,
    placeholder = 'Pick a year', disabled, minDate, maxDate,
    closeOnChange = true, valueFormat = { year: 'numeric' },
    size = 'md', onChange, classNames, class: className, ref,
  } = props;

  const id = uniqueId('year-picker-input');
  const [selected, setSelected] = signal<Date | null>(value !== undefined ? value : defaultValue);
  const [open, setOpen] = signal(false);
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = id;
  trigger.className = mergeClasses('mkt-picker-input__trigger', classNames?.trigger);
  trigger.dataset.size = size;
  if (disabled) trigger.disabled = true;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', () => { if (!disabled) setOpen(!open()); });

  effect(() => {
    const v = selected();
    trigger.replaceChildren();
    if (v) {
      trigger.textContent = formatDate(v, locale, valueFormat);
    } else {
      const ph = document.createElement('span');
      ph.className = 'mkt-picker-input__placeholder';
      ph.textContent = placeholder;
      trigger.appendChild(ph);
    }
    trigger.setAttribute('aria-expanded', String(open()));
  });

  const dropdown = document.createElement('div');
  dropdown.className = mergeClasses('mkt-picker-input__dropdown', classNames?.dropdown);
  dropdown.hidden = true;

  const picker = YearPicker({
    value: selected() ?? undefined,
    minDate, maxDate, size,
    onChange: (v) => {
      setSelected(v);
      onChange?.(v);
      if (closeOnChange) setOpen(false);
    },
  });
  dropdown.appendChild(picker);

  const container = document.createElement('div');
  container.className = mergeClasses('mkt-picker-input', classNames?.root);
  container.appendChild(trigger);
  container.appendChild(dropdown);

  effect(() => { dropdown.hidden = !open(); });
  const containerRef = createRef<HTMLElement>();
  containerRef(container);
  onClickOutside(containerRef, () => setOpen(false));

  if (ref) {
    if (typeof ref === 'function') ref(container);
    else (ref as { current: HTMLElement | null }).current = container;
  }

  return InputWrapper({
    id, label, description, error, required, size,
    class: className, classNames, children: container,
  });
}
