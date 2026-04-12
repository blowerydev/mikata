import { mergeClasses } from '../../utils/class-merge';
import type { KbdProps } from './Kbd.types';
import './Kbd.css';

export function Kbd(props: KbdProps = {}): HTMLElement {
  const { size = 'sm', children, class: className, ref } = props;

  const el = document.createElement('kbd');
  el.className = mergeClasses('mkt-kbd', className);
  el.dataset.size = size;

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
