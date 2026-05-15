import { signal, effect, renderEffect, getCurrentScope, onCleanup } from '@mikata/reactivity';
import { _mergeProps, createRef, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { onClickOutside } from '../../utils/on-click-outside';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { clampFloatingElement } from '../../utils/clamp-floating';
import { InputWrapper } from '../_internal/InputWrapper';
import { DatePicker } from '../DatePicker';
import { formatISODate, parseISODate, formatDisplayDate, isBefore, isAfter } from '../_internal/dates';
import type { DateInputProps } from './DateInput.types';
import './DateInput.css';

export function DateInput(userProps: DateInputProps = {}): HTMLDivElement {
  const props = _mergeProps(
    useComponentDefaults<DateInputProps>('DateInput') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as DateInputProps;

  const value = props.value;
  const defaultValue = props.defaultValue ?? null;
  const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const firstDayOfWeek = props.firstDayOfWeek;
  const closeOnChange = props.closeOnChange ?? true;
  const clearable = props.clearable ?? true;
  const onChange = props.onChange;

  const id = uniqueId('date-input');
  const [selected, setSelected] = signal<Date | null>(value !== undefined ? value : defaultValue);
  const [open, setOpen] = signal(false);
  let dropdownEl: HTMLDivElement | null = null;
  let disposeClamp: (() => void) | undefined;

  const setOpenState = (next: boolean) => {
    setOpen(next);
    if (dropdownEl) dropdownEl.hidden = !next;
    disposeClamp?.();
    disposeClamp = next && dropdownEl ? clampFloatingElement(dropdownEl) : undefined;
  };

  effect(() => {
    if (props.value !== undefined && !isSameNullableDate(props.value, selected())) {
      setSelected(props.value);
    }
  });

  function displayValue(d: Date | null): string {
    if (!d) return '';
    return formatDisplayDate(d, locale, props.valueFormat);
  }

  // Allow typing ISO (YYYY-MM-DD) or a locale-parseable value. On blur or
  // Enter we try to parse; invalid stays as-is and selection is unchanged.
  function commitTyped(input: HTMLInputElement) {
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
      input.value = displayValue(selected());
      return;
    }
    const minDate = props.minDate;
    const maxDate = props.maxDate;
    if (minDate && isBefore(parsed, minDate)) parsed = minDate;
    if (maxDate && isAfter(parsed, maxDate)) parsed = maxDate;
    if (props.excludeDate?.(parsed)) { input.value = displayValue(selected()); return; }
    setSelected(parsed);
    onChange?.(parsed);
    input.value = displayValue(parsed);
  }

  const buildContainer = () =>
    adoptElement<HTMLDivElement>('div', (container) => {
      renderEffect(() => {
        container.className = mergeClasses('mkt-text-input', 'mkt-date-input', props.classNames?.root);
      });

      adoptElement<HTMLInputElement>('input', (input) => {
        input.type = 'text';
        input.id = id;
        renderEffect(() => {
          input.className = mergeClasses('mkt-text-input__input', props.classNames?.input);
        });
        renderEffect(() => { input.dataset.size = props.size ?? 'md'; });
        input.autocomplete = 'off';
        renderEffect(() => { input.placeholder = props.placeholder ?? ''; });
        renderEffect(() => { input.disabled = !!props.disabled; });
        renderEffect(() => {
          if (props.required) input.setAttribute('aria-required', 'true');
          else input.removeAttribute('aria-required');
        });
        renderEffect(() => {
          const parts: string[] = [];
          if (props.description) parts.push(`${id}-description`);
          if (hasError(props.error)) parts.push(`${id}-error`);
          if (parts.length) input.setAttribute('aria-describedby', parts.join(' '));
          else input.removeAttribute('aria-describedby');
        });
        renderEffect(() => {
          if (hasError(props.error)) {
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-errormessage', `${id}-error`);
          } else {
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-errormessage');
          }
        });

        effect(() => { input.value = displayValue(selected()); });

        input.addEventListener('focus', () => { if (!props.disabled) setOpenState(true); });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { setOpenState(false); input.blur(); }
          else if (e.key === 'Enter') { commitTyped(input); setOpenState(false); }
          else if (e.key === 'ArrowDown' && !open()) { e.preventDefault(); setOpenState(true); }
        });
        input.addEventListener('blur', () => {
          commitTyped(input);
        });
      });

      adoptElement<HTMLDivElement>('div', (dropdown) => {
        dropdownEl = dropdown;
        renderEffect(() => {
          dropdown.className = mergeClasses('mkt-date-input__dropdown', props.classNames?.dropdown);
        });
        dropdown.hidden = true;

        if (!dropdown.firstChild) {
          const picker = DatePicker({
            get value() { return selected(); },
            get date() { return selected() ?? undefined; },
            get minDate() { return props.minDate; },
            get maxDate() { return props.maxDate; },
            get excludeDate() { return props.excludeDate; },
            locale,
            firstDayOfWeek,
            get size() { return props.size ?? 'md'; },
            get classNames() {
              const cal = props.classNames?.calendar;
              return cal ? { root: cal as string } : undefined;
            },
            onChange: (v) => {
              const d = v as Date;
              setSelected(d);
              onChange?.(d);
              if (closeOnChange) setOpenState(false);
            },
          });
          dropdown.appendChild(picker);
        }

        effect(() => { dropdown.hidden = !open(); });
      });

      const containerRef = createRef<HTMLElement>();
      containerRef(container);
      onClickOutside(containerRef, () => setOpenState(false));
      if (getCurrentScope()) {
        onCleanup(() => disposeClamp?.());
      }

      const ref = props.ref;
      if (ref) {
        if (typeof ref === 'function') ref(container as unknown as HTMLInputElement);
        else (ref as { current: HTMLElement | null }).current = container;
      }
    });

  return InputWrapper({
    id,
    get label() { return props.label; },
    get description() { return props.description; },
    get error() { return props.error; },
    get required() { return props.required; },
    get size() { return props.size ?? 'md'; },
    get class() { return props.class; },
    get classNames() { return props.classNames; },
    children: buildContainer,
  });
}

function isSameNullableDate(a: Date | null | undefined, b: Date | null): boolean {
  if (a == null || b == null) return a == null && b == null;
  return a.getTime() === b.getTime();
}

function hasError(err: unknown): boolean {
  if (err == null || err === false || err === '') return false;
  if (typeof err === 'function') {
    const v = (err as () => unknown)();
    return v != null && v !== false && v !== '';
  }
  return true;
}
