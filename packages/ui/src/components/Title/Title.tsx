import { mergeClasses } from '../../utils/class-merge';
import type { TitleProps } from './Title.types';
import './Title.css';

export function Title(props: TitleProps = {}): HTMLElement {
  const {
    order = 1,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement(`h${order}`);
  el.className = mergeClasses('mkt-title', className);
  el.dataset.order = String(order);

  if (children != null) {
    if (typeof children === 'string') {
      el.textContent = children;
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
