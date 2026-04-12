import { mergeClasses } from '../../utils/class-merge';
import { Loader } from '../Loader';
import type { ButtonProps } from './Button.types';
import './Button.css';

export function Button(props: ButtonProps = {}): HTMLButtonElement {
  const {
    variant = 'filled',
    size = 'md',
    color = 'primary',
    loading,
    leftIcon,
    rightIcon,
    fullWidth,
    disabled,
    type = 'button',
    onClick,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('button');

  el.className = mergeClasses(
    'mkt-button',
    fullWidth && 'mkt-button--full-width',
    className,
    classNames?.root,
  );

  el.dataset.variant = variant;
  el.dataset.size = size;
  el.dataset.color = color;
  el.type = type;

  if (disabled) el.disabled = true;
  if (loading) {
    el.dataset.loading = '';
    el.setAttribute('aria-busy', 'true');
    el.disabled = true;
  }

  if (onClick) el.addEventListener('click', onClick);

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  // Left icon
  if (leftIcon) {
    const iconWrap = document.createElement('span');
    iconWrap.className = mergeClasses('mkt-button__icon', classNames?.icon);
    iconWrap.appendChild(leftIcon);
    el.appendChild(iconWrap);
  }

  // Label
  const label = document.createElement('span');
  label.className = mergeClasses('mkt-button__label', classNames?.label);
  if (children instanceof Node) {
    label.appendChild(children);
  } else if (children != null) {
    label.textContent = String(children);
  }
  el.appendChild(label);

  // Right icon
  if (rightIcon) {
    const iconWrap = document.createElement('span');
    iconWrap.className = mergeClasses('mkt-button__icon', classNames?.icon);
    iconWrap.appendChild(rightIcon);
    el.appendChild(iconWrap);
  }

  // Loader (shown when loading)
  if (loading) {
    const loaderWrap = document.createElement('span');
    loaderWrap.className = mergeClasses('mkt-button__loader', classNames?.loader);
    loaderWrap.appendChild(
      Loader({ size, color: variant === 'filled' ? undefined : color }),
    );
    el.appendChild(loaderWrap);
  }

  return el;
}
