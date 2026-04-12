import { createIcon, Check } from '@mikata/icons';
import { effect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
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
    onBlur,
    classNames,
    class: className,
    ref,
  } = props;

  const id = uniqueId('checkbox');

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
  if (typeof error === 'function') {
    effect(() => {
      if (error()) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
  } else if (error) {
    input.setAttribute('aria-invalid', 'true');
  }
  if (onChange) input.addEventListener('change', onChange);
  if (onBlur) input.addEventListener('blur', onBlur as EventListener);

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

  const svgSize = size === 'xs' || size === 'sm' ? 10 : size === 'lg' ? 16 : size === 'xl' ? 20 : 12;
  icon.appendChild(createIcon(Check, { size: svgSize, strokeWidth: 3 }));

  root.appendChild(icon);

  // Label + description + error column
  if (label || description || error) {
    const textCol = document.createElement('div');

    if (label) {
      const labelSpan = document.createElement('span');
      labelSpan.className = mergeClasses('mkt-checkbox__label', classNames?.label);
      if (label instanceof Node) { labelSpan.appendChild(label); } else { labelSpan.textContent = label; }
      textCol.appendChild(labelSpan);
    }

    if (description) {
      const descEl = document.createElement('p');
      descEl.className = 'mkt-checkbox__description';
      if (description instanceof Node) descEl.appendChild(description);
      else descEl.textContent = description;
      textCol.appendChild(descEl);
    }

    if (typeof error === 'function') {
      const errorEl = document.createElement('p');
      errorEl.className = 'mkt-checkbox__error';
      errorEl.setAttribute('role', 'alert');
      textCol.appendChild(errorEl);
      effect(() => {
        const e = error();
        errorEl.replaceChildren();
        if (e == null) {
          errorEl.hidden = true;
        } else {
          errorEl.hidden = false;
          if (e instanceof Node) errorEl.appendChild(e);
          else errorEl.textContent = String(e);
        }
      });
    } else if (error) {
      const errorEl = document.createElement('p');
      errorEl.className = 'mkt-checkbox__error';
      errorEl.setAttribute('role', 'alert');
      if (error instanceof Node) errorEl.appendChild(error);
      else errorEl.textContent = error;
      textCol.appendChild(errorEl);
    }

    root.appendChild(textCol);
  }

  return root;
}
