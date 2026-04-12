import { mergeClasses } from '../../utils/class-merge';
import type { MarkProps } from './Mark.types';
import './Mark.css';

export function Mark(props: MarkProps = {}): HTMLElement {
  const { color = 'yellow', children, class: className, ref } = props;

  const el = document.createElement('mark');
  el.className = mergeClasses('mkt-mark', className);
  el.dataset.color = color;

  if (children != null) {
    if (typeof children === 'string') el.textContent = children;
    else el.appendChild(children);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
