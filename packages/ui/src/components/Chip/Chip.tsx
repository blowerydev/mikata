import { mergeClasses } from '../../utils/class-merge';
import { uniqueId } from '../../utils/unique-id';
import type { ChipProps } from './Chip.types';
import './Chip.css';

export function Chip(props: ChipProps = {}): HTMLElement {
  const {
    value,
    checked,
    defaultChecked,
    size = 'md',
    color = 'primary',
    variant = 'outline',
    radius = 'full',
    disabled,
    type = 'checkbox',
    name,
    onChange,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const id = uniqueId('chip');

  const root = document.createElement('label');
  root.className = mergeClasses('mkt-chip', className, classNames?.root);
  root.htmlFor = id;
  root.dataset.size = size;
  root.dataset.color = color;
  root.dataset.variant = variant;
  root.dataset.radius = radius;
  if (disabled) root.dataset.disabled = '';

  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.className = mergeClasses('mkt-chip__input', classNames?.input);
  if (name) input.name = name;
  if (value != null) input.value = value;
  if (checked != null) input.checked = checked;
  else if (defaultChecked) input.checked = true;
  if (disabled) input.disabled = true;

  input.addEventListener('change', () => {
    onChange?.(input.checked, value);
  });

  // Check icon
  const iconWrap = document.createElement('span');
  iconWrap.className = mergeClasses('mkt-chip__icon', classNames?.iconWrap);
  iconWrap.innerHTML =
    '<svg viewBox="0 0 10 7" width="10" height="7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M1 3.5L3.5 6L9 1"/></svg>';

  const label = document.createElement('span');
  label.className = mergeClasses('mkt-chip__label', classNames?.label);
  if (children != null) {
    if (typeof children === 'string') label.textContent = children;
    else label.appendChild(children);
  }

  root.appendChild(input);
  root.appendChild(iconWrap);
  root.appendChild(label);

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
