import { signal, effect } from '@mikata/reactivity';
import { createRef } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { onClickOutside } from '../../utils/on-click-outside';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import { DatePicker } from '../DatePicker';
import { formatISODate, parseISODate, formatDisplayDate, isBefore, isAfter } from '../_internal/dates';
import type { DateInputProps } from './DateInput.types';
import './DateInput.css';

export function DateInput(userProps: DateInputProps = {}): HTMLDivElement {
  const props = { ...useComponentDefaults<DateInputProps>('DateInput'), ...userProps };
  const {
    value,
    defaultValue = null,
    label,
    description,
    error,
    required,
    placeholder,
    disabled,
    minDate,
    maxDate,
    excludeDate,
    locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    firstDayOfWeek,
    closeOnChange = true,
    valueFormat,
    clearable = true,
    size = 'md',
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('date-input');
  const [selected, setSelected] = signal<Date | null>(value !== undefined ? value : defaultValue);
  const [open, setOpen] = signal(false);

  function displayValue(d: Date | null): string {
    if (!d) return '';
    return formatDisplayDate(d, locale, valueFormat);
  }

  // Input
  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.className = mergeClasses('mkt-text-input__input', classNames?.input);
  input.dataset.size = size;
  input.autocomplete = 'off';
  if (placeholder) input.placeholder = placeholder;
  if (disabled) input.disabled = true;
  if (required) input.setAttribute('aria-required', 'true');

  effect(() => { input.value = displayValue(selected()); });

  // Allow typing ISO (YYYY-MM-DD) or a locale-parseable value. On blur or
  // Enter we try to parse; invalid stays as-is and selection is unchanged.
  function commitTyped() {
    const raw = input.value.trim();
    if (!raw) {
      if (clearable) {
        setSelected(null);
        onChange?.(null);
      }
      return;
    }
    let parsed = parseISODate(raw);
    if (!parsed) {
      const asTime = Date.parse(raw);
      if (!Number.isNaN(asTime)) parsed = new Date(asTime);
    }
    if (!parsed) {
      // Revert to current selected if present
      input.value = displayValue(selected());
      return;
    }
    if (minDate && isBefore(parsed, minDate)) parsed = minDate;
    if (maxDate && isAfter(parsed, maxDate)) parsed = maxDate;
    if (excludeDate?.(parsed)) { input.value = displayValue(selected()); return; }
    setSelected(parsed);
    onChange?.(parsed);
    // Normalize display to the canonical format.
    input.value = displayValue(parsed);
  }

  input.addEventListener('focus', () => { if (!disabled) setOpen(true); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setOpen(false); input.blur(); }
    else if (e.key === 'Enter') { commitTyped(); setOpen(false); }
    else if (e.key === 'ArrowDown' && !open()) { e.preventDefault(); setOpen(true); }
  });
  input.addEventListener('blur', () => {
    // Commit typed value on blur, but defer close in case focus moved into dropdown.
    commitTyped();
  });

  // Dropdown containing the calendar
  const dropdown = document.createElement('div');
  dropdown.className = mergeClasses('mkt-date-input__dropdown', classNames?.dropdown);
  dropdown.hidden = true;

  const picker = DatePicker({
    value: selected(),
    date: selected() ?? undefined,
    minDate,
    maxDate,
    excludeDate,
    locale,
    firstDayOfWeek,
    size,
    classNames: classNames?.calendar ? { root: classNames.calendar as string } : undefined,
    onChange: (v) => {
      const d = v as Date;
      setSelected(d);
      onChange?.(d);
      if (closeOnChange) setOpen(false);
    },
  });
  dropdown.appendChild(picker);

  // Container wrapping input + dropdown for positioning.
  const container = document.createElement('div');
  container.className = mergeClasses('mkt-text-input', 'mkt-date-input', classNames?.root);
  container.appendChild(input);
  container.appendChild(dropdown);

  effect(() => { dropdown.hidden = !open(); });

  const containerRef = createRef<HTMLElement>();
  containerRef(container);
  onClickOutside(containerRef, () => setOpen(false));

  if (ref) {
    if (typeof ref === 'function') ref(container as unknown as HTMLInputElement);
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
