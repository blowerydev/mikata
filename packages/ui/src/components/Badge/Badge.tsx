import { mergeClasses } from '../../utils/class-merge';
import type { BadgeProps } from './Badge.types';
import './Badge.css';

export function Badge(props: BadgeProps = {}): HTMLElement {
  const {
    variant = 'filled',
    size = 'md',
    color = 'primary',
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('span');
  el.className = mergeClasses('mkt-badge', className);
  el.dataset.variant = variant;
  el.dataset.size = size;
  el.dataset.color = color;

  // Dot indicator for dot variant
  if (variant === 'dot') {
    const dot = document.createElement('span');
    dot.className = 'mkt-badge__dot';
    el.appendChild(dot);
  }

  if (children != null) {
    if (typeof children === 'string') {
      const textNode = document.createTextNode(children);
      el.appendChild(textNode);
    } else {
      el.appendChild(children);
    }
  }

  if (ref) {
    if (typeof ref === 'function') {
      ref(el);
    } else {
      (ref as any).current = el;
    }
  }

  return el;
}
