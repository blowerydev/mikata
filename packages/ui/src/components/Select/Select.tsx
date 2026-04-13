import { onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { SelectProps, SelectOption, SelectFetcher } from './Select.types';
import './Select.css';

export function Select(userProps: SelectProps): HTMLDivElement {
  const props = { ...useComponentDefaults<SelectProps>('Select'), ...userProps };
  const {
    data,
    value,
    defaultValue,
    placeholder,
    label,
    description,
    error,
    required,
    disabled,
    size = 'md',
    loadingLabel = 'Loading…',
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('select');
  const isAsync = typeof data === 'function';

  const select = document.createElement('select');
  select.id = id;
  select.className = mergeClasses('mkt-select__input', classNames?.input);
  select.dataset.size = size;

  if (disabled) select.disabled = true;
  if (required) select.setAttribute('aria-required', 'true');
  if (error) select.setAttribute('aria-invalid', 'true');

  const describedBy: string[] = [];
  if (description) describedBy.push(`${id}-description`);
  if (error) describedBy.push(`${id}-error`);
  if (describedBy.length) select.setAttribute('aria-describedby', describedBy.join(' '));
  if (error) select.setAttribute('aria-errormessage', `${id}-error`);

  function appendPlaceholder(text: string, preselect: boolean) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = text;
    opt.disabled = true;
    opt.selected = preselect;
    select.appendChild(opt);
  }

  function appendOptions(items: SelectOption[]) {
    for (const item of items) {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      if (item.disabled) option.disabled = true;
      select.appendChild(option);
    }
  }

  if (isAsync) {
    // Show a disabled "Loading…" placeholder while the loader runs. We leave
    // the user's real placeholder unrendered until data arrives so there's no
    // flicker between two distinct empty states.
    appendPlaceholder(loadingLabel, true);
    select.dataset.loading = '';
    select.disabled = true;

    const controller = new AbortController();
    onCleanup(() => controller.abort());

    (data as SelectFetcher)(controller.signal).then(
      (items) => {
        if (controller.signal.aborted) return;
        // Swap in real options.
        select.textContent = '';
        if (placeholder) appendPlaceholder(placeholder, !value && !defaultValue);
        appendOptions(items);
        if (value != null) select.value = value;
        else if (defaultValue != null) select.value = defaultValue;
        delete select.dataset.loading;
        if (!disabled) select.disabled = false;
      },
      (err) => {
        if (controller.signal.aborted) return;
        // Leave loading placeholder; surface error to console so the failure
        // isn't silent during development.
        if (typeof console !== 'undefined') console.error('[mikata/Select] fetcher rejected:', err);
      },
    );
  } else {
    // Placeholder option
    if (placeholder) appendPlaceholder(placeholder, !value && !defaultValue);
    appendOptions(data as SelectOption[]);
    if (value != null) select.value = value;
    else if (defaultValue != null) select.value = defaultValue;
  }

  if (onChange) select.addEventListener('change', onChange as EventListener);

  if (ref) {
    if (typeof ref === 'function') ref(select as any);
    else (ref as any).current = select;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-select';
  wrapper.appendChild(select);

  return InputWrapper({
    id,
    label,
    description,
    error,
    required,
    size,
    class: className,
    classNames,
    children: wrapper,
  });
}
