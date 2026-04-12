import { mergeClasses } from '../../utils/class-merge';
import { useId } from '../../utils/use-id';
import type { SwitchProps } from './Switch.types';
import './Switch.css';

export function Switch(props: SwitchProps = {}): HTMLLabelElement {
  const {
    checked,
    defaultChecked,
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

  const id = useId('switch');

  const root = document.createElement('label');
  root.className = mergeClasses(
    'mkt-switch',
    disabled && 'mkt-switch--disabled',
    className,
    classNames?.root,
  );
  root.dataset.color = color;

  // Hidden native checkbox
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.className = mergeClasses('mkt-switch__input', classNames?.input);
  input.setAttribute('role', 'switch');
  if (checked != null) input.checked = checked;
  if (defaultChecked != null && checked == null) input.checked = defaultChecked;
  if (disabled) input.disabled = true;
  if (error) input.setAttribute('aria-invalid', 'true');
  if (onChange) input.addEventListener('change', onChange);

  if (ref) {
    if (typeof ref === 'function') ref(input);
    else (ref as any).current = input;
  }

  root.appendChild(input);

  // Track
  const track = document.createElement('div');
  track.className = mergeClasses('mkt-switch__track', classNames?.track);
  track.dataset.size = size;
  track.setAttribute('aria-hidden', 'true');

  // Thumb
  const thumb = document.createElement('div');
  thumb.className = mergeClasses('mkt-switch__thumb', classNames?.thumb);
  thumb.dataset.size = size;
  track.appendChild(thumb);

  root.appendChild(track);

  // Label + description + error column
  if (label || description || error) {
    const textCol = document.createElement('div');

    if (label) {
      const labelSpan = document.createElement('span');
      labelSpan.className = mergeClasses('mkt-switch__label', classNames?.label);
      labelSpan.textContent = label;
      textCol.appendChild(labelSpan);
    }

    if (description) {
      const descEl = document.createElement('p');
      descEl.className = 'mkt-switch__description';
      descEl.textContent = description;
      textCol.appendChild(descEl);
    }

    if (error) {
      const errorEl = document.createElement('p');
      errorEl.className = 'mkt-switch__error';
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent = error;
      textCol.appendChild(errorEl);
    }

    root.appendChild(textCol);
  }

  return root;
}
