import { mergeClasses } from '../../utils/class-merge';
import type { VisuallyHiddenProps } from './VisuallyHidden.types';
import './VisuallyHidden.css';

export function VisuallyHidden(props: VisuallyHiddenProps = {}): HTMLElement {
  const { children, class: className, ref } = props;

  const el = document.createElement('span');
  el.className = mergeClasses('mkt-visually-hidden', className);

  if (children != null) {
    if (typeof children === 'string') el.textContent = children;
    else if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
