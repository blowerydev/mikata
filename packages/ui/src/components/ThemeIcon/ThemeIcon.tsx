import { mergeClasses } from '../../utils/class-merge';
import type { ThemeIconProps } from './ThemeIcon.types';
import './ThemeIcon.css';

export function ThemeIcon(props: ThemeIconProps = {}): HTMLElement {
  const {
    variant = 'filled',
    size = 'md',
    color = 'primary',
    radius,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('span');
  el.className = mergeClasses('mkt-theme-icon', className);
  el.dataset.variant = variant;
  el.dataset.color = color;

  if (typeof size === 'number') {
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
  } else {
    el.dataset.size = size;
  }

  if (radius != null) {
    if (typeof radius === 'number') el.style.borderRadius = `${radius}px`;
    else el.dataset.radius = radius;
  }

  if (children) el.appendChild(children);

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
