import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { SelectProps } from './Select.types';
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
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('select');

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

  // Placeholder option
  if (placeholder) {
    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = placeholder;
    placeholderOpt.disabled = true;
    placeholderOpt.selected = !value && !defaultValue;
    select.appendChild(placeholderOpt);
  }

  // Data options
  for (const item of data) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    if (item.disabled) option.disabled = true;
    select.appendChild(option);
  }

  if (value != null) select.value = value;
  else if (defaultValue != null) select.value = defaultValue;

  if (onChange) select.addEventListener('change', onChange);

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
