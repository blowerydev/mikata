import { mergeClasses } from '../../utils/class-merge';
import type { BoxProps } from './Box.types';
import './Box.css';

function appendChildren(parent: HTMLElement, children: Node | Node[] | undefined) {
  if (!children) return;
  if (Array.isArray(children)) {
    for (const child of children) parent.appendChild(child);
  } else {
    parent.appendChild(children);
  }
}

export function Box(props: BoxProps = {}): HTMLElement {
  const {
    component = 'div',
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement(component);
  el.className = mergeClasses('mkt-box', className);

  appendChildren(el, children);

  if (ref) {
    if (typeof ref === 'function') {
      ref(el);
    } else {
      (ref as any).current = el;
    }
  }

  return el;
}
