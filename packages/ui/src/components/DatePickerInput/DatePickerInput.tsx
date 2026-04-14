import { signal, effect, renderEffect } from '@mikata/reactivity';
import { _mergeProps, createRef } from '@mikata/runtime';
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
  const props = _mergeProps(
    useComponentDefaults<DatePickerInputProps>('DatePickerInput') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as DatePickerInputProps;

  const type = props.type ?? 'default';
  const value = props.value;
  const defaultValue = props.defaultValue ?? null;
  const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const firstDayOfWeek = props.firstDayOfWeek;
  const closeOnChange = props.closeOnChange ?? true;
  const onChange = props.onChange;

  const id = uniqueId('date-picker-input');
  const [selected, setSelected] = signal<Date | Date[] | [Date | null, Date | null] | null>(
    value !== undefined ? value : defaultValue,
  );
  const [open, setOpen] = signal(false);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = id;
  renderEffect(() => {
    trigger.className = mergeClasses('mkt-picker-input__trigger', props.classNames?.trigger);
  });
  renderEffect(() => { trigger.dataset.size = props.size ?? 'md'; });
  renderEffect(() => { trigger.disabled = !!props.disabled; });
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', () => { if (!props.disabled) setOpen(!open()); });

  effect(() => {
    const str = displayFor(selected(), type, locale, props.valueFormat);
    trigger.replaceChildren();
    if (str) {
      trigger.textContent = str;
    } else {
      const ph = document.createElement('span');
      ph.className = mergeClasses('mkt-picker-input__placeholder', props.classNames?.placeholder);
      ph.textContent = props.placeholder ?? 'Pick a date';
      trigger.appendChild(ph);
    }
    trigger.setAttribute('aria-expanded', String(open()));
  });

  const dropdown = document.createElement('div');
  renderEffect(() => {
    dropdown.className = mergeClasses('mkt-picker-input__dropdown', props.classNames?.dropdown);
  });
  dropdown.hidden = true;

  const picker = DatePicker({
    type,
    get value() { return selected() ?? undefined; },
    get minDate() { return props.minDate; },
    get maxDate() { return props.maxDate; },
    get excludeDate() { return props.excludeDate; },
    locale,
    firstDayOfWeek,
    get size() { return props.size ?? 'md'; },
    onChange: (v) => {
      setSelected(v);
      onChange?.(v);
      if (type === 'default' && closeOnChange) setOpen(false);
    },
  });
  dropdown.appendChild(picker);

  const container = document.createElement('div');
  renderEffect(() => {
    container.className = mergeClasses('mkt-picker-input', props.classNames?.root);
  });
  container.appendChild(trigger);
  container.appendChild(dropdown);

  effect(() => { dropdown.hidden = !open(); });

  const containerRef = createRef<HTMLElement>();
  containerRef(container);
  onClickOutside(containerRef, () => setOpen(false));

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(container);
    else (ref as { current: HTMLElement | null }).current = container;
  }

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size ?? 'md'; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: container,
  });
}

/** Button trigger + MonthPicker dropdown. */
export function MonthPickerInput(userProps: MonthPickerInputProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<MonthPickerInputProps>('MonthPickerInput') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as MonthPickerInputProps;

  const value = props.value;
  const defaultValue = props.defaultValue ?? null;
  const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const closeOnChange = props.closeOnChange ?? true;
  const onChange = props.onChange;

  const id = uniqueId('month-picker-input');
  const [selected, setSelected] = signal<Date | null>(value !== undefined ? value : defaultValue);
  const [open, setOpen] = signal(false);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = id;
  renderEffect(() => {
    trigger.className = mergeClasses('mkt-picker-input__trigger', props.classNames?.trigger);
  });
  renderEffect(() => { trigger.dataset.size = props.size ?? 'md'; });
  renderEffect(() => { trigger.disabled = !!props.disabled; });
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', () => { if (!props.disabled) setOpen(!open()); });

  effect(() => {
    const v = selected();
    trigger.replaceChildren();
    if (v) {
      trigger.textContent = formatDate(v, locale, props.valueFormat ?? { year: 'numeric', month: 'long' });
    } else {
      const ph = document.createElement('span');
      ph.className = 'mkt-picker-input__placeholder';
      ph.textContent = props.placeholder ?? 'Pick a month';
      trigger.appendChild(ph);
    }
    trigger.setAttribute('aria-expanded', String(open()));
  });

  const dropdown = document.createElement('div');
  renderEffect(() => {
    dropdown.className = mergeClasses('mkt-picker-input__dropdown', props.classNames?.dropdown);
  });
  dropdown.hidden = true;

  const picker = MonthPicker({
    get value() { return selected() ?? undefined; },
    get minDate() { return props.minDate; },
    get maxDate() { return props.maxDate; },
    locale,
    get size() { return props.size ?? 'md'; },
    onChange: (v) => {
      setSelected(v);
      onChange?.(v);
      if (closeOnChange) setOpen(false);
    },
  });
  dropdown.appendChild(picker);

  const container = document.createElement('div');
  renderEffect(() => {
    container.className = mergeClasses('mkt-picker-input', props.classNames?.root);
  });
  container.appendChild(trigger);
  container.appendChild(dropdown);

  effect(() => { dropdown.hidden = !open(); });
  const containerRef = createRef<HTMLElement>();
  containerRef(container);
  onClickOutside(containerRef, () => setOpen(false));

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(container);
    else (ref as { current: HTMLElement | null }).current = container;
  }

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size ?? 'md'; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: container,
  });
}

/** Button trigger + YearPicker dropdown. */
export function YearPickerInput(userProps: YearPickerInputProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<YearPickerInputProps>('YearPickerInput') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as YearPickerInputProps;

  const value = props.value;
  const defaultValue = props.defaultValue ?? null;
  const closeOnChange = props.closeOnChange ?? true;
  const onChange = props.onChange;

  const id = uniqueId('year-picker-input');
  const [selected, setSelected] = signal<Date | null>(value !== undefined ? value : defaultValue);
  const [open, setOpen] = signal(false);
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = id;
  renderEffect(() => {
    trigger.className = mergeClasses('mkt-picker-input__trigger', props.classNames?.trigger);
  });
  renderEffect(() => { trigger.dataset.size = props.size ?? 'md'; });
  renderEffect(() => { trigger.disabled = !!props.disabled; });
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.addEventListener('click', () => { if (!props.disabled) setOpen(!open()); });

  effect(() => {
    const v = selected();
    trigger.replaceChildren();
    if (v) {
      trigger.textContent = formatDate(v, locale, props.valueFormat ?? { year: 'numeric' });
    } else {
      const ph = document.createElement('span');
      ph.className = 'mkt-picker-input__placeholder';
      ph.textContent = props.placeholder ?? 'Pick a year';
      trigger.appendChild(ph);
    }
    trigger.setAttribute('aria-expanded', String(open()));
  });

  const dropdown = document.createElement('div');
  renderEffect(() => {
    dropdown.className = mergeClasses('mkt-picker-input__dropdown', props.classNames?.dropdown);
  });
  dropdown.hidden = true;

  const picker = YearPicker({
    get value() { return selected() ?? undefined; },
    get minDate() { return props.minDate; },
    get maxDate() { return props.maxDate; },
    get size() { return props.size ?? 'md'; },
    onChange: (v) => {
      setSelected(v);
      onChange?.(v);
      if (closeOnChange) setOpen(false);
    },
  });
  dropdown.appendChild(picker);

  const container = document.createElement('div');
  renderEffect(() => {
    container.className = mergeClasses('mkt-picker-input', props.classNames?.root);
  });
  container.appendChild(trigger);
  container.appendChild(dropdown);

  effect(() => { dropdown.hidden = !open(); });
  const containerRef = createRef<HTMLElement>();
  containerRef(container);
  onClickOutside(containerRef, () => setOpen(false));

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(container);
    else (ref as { current: HTMLElement | null }).current = container;
  }

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size ?? 'md'; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: container,
  });
}
