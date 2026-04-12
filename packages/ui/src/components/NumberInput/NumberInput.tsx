import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import { InputWrapper } from '../_internal/InputWrapper';
import type { NumberInputProps } from './NumberInput.types';
import './NumberInput.css';

export function NumberInput(props: NumberInputProps = {}): HTMLDivElement {
  const {
    value,
    defaultValue,
    placeholder,
    label,
    description,
    error,
    required,
    disabled,
    size = 'md',
    min,
    max,
    step = 1,
    onValueChange,
    onInput,
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('number-input');

  const input = document.createElement('input');
  input.type = 'number';
  input.id = id;
  input.className = mergeClasses('mkt-number-input__input', classNames?.input);
  input.dataset.size = size;

  if (value != null) input.value = String(value);
  if (defaultValue != null && value == null) input.value = String(defaultValue);
  if (placeholder) input.placeholder = placeholder;
  if (disabled) input.disabled = true;
  if (min != null) input.min = String(min);
  if (max != null) input.max = String(max);
  input.step = String(step);
  if (required) input.setAttribute('aria-required', 'true');
  if (error) input.setAttribute('aria-invalid', 'true');

  const describedBy: string[] = [];
  if (description) describedBy.push(`${id}-description`);
  if (error) describedBy.push(`${id}-error`);
  if (describedBy.length) input.setAttribute('aria-describedby', describedBy.join(' '));
  if (error) input.setAttribute('aria-errormessage', `${id}-error`);

  const clampAndNotify = (val: number) => {
    if (min != null && val < min) val = min;
    if (max != null && val > max) val = max;
    input.value = String(val);
    if (onValueChange) onValueChange(val);
  };

  if (onInput) input.addEventListener('input', onInput as EventListener);
  if (onChange) input.addEventListener('change', onChange);

  input.addEventListener('change', () => {
    const num = parseFloat(input.value);
    if (!isNaN(num) && onValueChange) {
      clampAndNotify(num);
    }
  });

  if (ref) {
    if (typeof ref === 'function') ref(input);
    else (ref as any).current = input;
  }

  // Increment/decrement controls
  const controls = document.createElement('div');
  controls.className = mergeClasses('mkt-number-input__controls', classNames?.controls);

  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.className = mergeClasses('mkt-number-input__control', classNames?.controlUp);
  upBtn.tabIndex = -1;
  upBtn.setAttribute('aria-label', 'Increment');
  upBtn.innerHTML = '&#9650;';
  if (disabled) upBtn.disabled = true;

  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.className = mergeClasses('mkt-number-input__control', classNames?.controlDown);
  downBtn.tabIndex = -1;
  downBtn.setAttribute('aria-label', 'Decrement');
  downBtn.innerHTML = '&#9660;';
  if (disabled) downBtn.disabled = true;

  upBtn.addEventListener('click', () => {
    const current = parseFloat(input.value) || 0;
    clampAndNotify(current + step);
  });

  downBtn.addEventListener('click', () => {
    const current = parseFloat(input.value) || 0;
    clampAndNotify(current - step);
  });

  controls.appendChild(upBtn);
  controls.appendChild(downBtn);

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'mkt-number-input';
  wrapper.appendChild(input);
  wrapper.appendChild(controls);

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
