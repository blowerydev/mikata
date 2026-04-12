import { mergeClasses } from '../../utils/class-merge';
import { useId } from '../../utils/use-id';
import type { CheckboxProps } from './Checkbox.types';
import './Checkbox.css';

export function Checkbox(props: CheckboxProps = {}): HTMLLabelElement {
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

  const id = useId('checkbox');

  const root = document.createElement('label');
  root.className = mergeClasses(
    'mkt-checkbox',
    disabled && 'mkt-checkbox--disabled',
    className,
    classNames?.root,
  );
  root.dataset.color = color;

  // Hidden native checkbox
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.className = mergeClasses('mkt-checkbox__input', classNames?.input);
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

  // Custom indicator
  const icon = document.createElement('div');
  icon.className = mergeClasses('mkt-checkbox__icon', classNames?.icon);
  icon.dataset.size = size;
  icon.setAttribute('aria-hidden', 'true');

  // Checkmark SVG
  const svgSize = size === 'xs' || size === 'sm' ? 10 : size === 'lg' ? 16 : size === 'xl' ? 20 : 12;
  icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  root.appendChild(icon);

  // Label + description + error column
  if (label || description || error) {
    const textCol = document.createElement('div');

    if (label) {
      const labelSpan = document.createElement('span');
      labelSpan.className = mergeClasses('mkt-checkbox__label', classNames?.label);
      labelSpan.textContent = label;
      textCol.appendChild(labelSpan);
    }

    if (description) {
      const descEl = document.createElement('p');
      descEl.className = 'mkt-checkbox__description';
      descEl.textContent = description;
      textCol.appendChild(descEl);
    }

    if (error) {
      const errorEl = document.createElement('p');
      errorEl.className = 'mkt-checkbox__error';
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent = error;
      textCol.appendChild(errorEl);
    }

    root.appendChild(textCol);
  }

  return root;
}
