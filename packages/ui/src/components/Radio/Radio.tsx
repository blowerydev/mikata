import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { RadioProps } from './Radio.types';
import './Radio.css';

export function Radio(props: RadioProps = {}): HTMLLabelElement {
  const {
    checked,
    defaultChecked,
    name,
    value,
    label,
    description,
    error,
    size = 'md',
    color = 'primary',
    disabled,
    onChange,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('radio');

  const root = document.createElement('label');
  root.className = mergeClasses(
    'mkt-radio',
    disabled && 'mkt-radio--disabled',
    className,
    classNames?.root,
  );
  root.dataset.color = color;

  // Hidden native radio
  const input = document.createElement('input');
  input.type = 'radio';
  input.id = id;
  input.className = mergeClasses('mkt-radio__input', classNames?.input);
  if (checked != null) input.checked = checked;
  if (defaultChecked != null && checked == null) input.checked = defaultChecked;
  if (name) input.name = name;
  if (value != null) input.value = value;
  if (disabled) input.disabled = true;
  if (error) input.setAttribute('aria-invalid', 'true');
  if (onChange) input.addEventListener('change', onChange);

  if (ref) {
    if (typeof ref === 'function') ref(input);
    else (ref as any).current = input;
  }

  root.appendChild(input);

  // Custom indicator (circle)
  const icon = document.createElement('div');
  icon.className = mergeClasses('mkt-radio__icon', classNames?.icon);
  icon.dataset.size = size;
  icon.setAttribute('aria-hidden', 'true');
  root.appendChild(icon);

  // Label + description + error column
  if (label || description || error) {
    const textCol = document.createElement('div');

    if (label) {
      const labelSpan = document.createElement('span');
      labelSpan.className = mergeClasses('mkt-radio__label', classNames?.label);
      labelSpan.textContent = label;
      textCol.appendChild(labelSpan);
    }

    if (description) {
      const descEl = document.createElement('p');
      descEl.className = 'mkt-radio__description';
      descEl.textContent = description;
      textCol.appendChild(descEl);
    }

    if (error) {
      const errorEl = document.createElement('p');
      errorEl.className = 'mkt-radio__error';
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent = error;
      textCol.appendChild(errorEl);
    }

    root.appendChild(textCol);
  }

  return root;
}
