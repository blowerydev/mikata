import { mergeClasses } from '../../utils/class-merge';
import type { ContainerProps } from './Container.types';
import './Container.css';

function appendChildren(parent: HTMLElement, children: Node | Node[] | undefined) {
  if (!children) return;
  if (Array.isArray(children)) {
    for (const child of children) parent.appendChild(child);
  } else {
    parent.appendChild(children);
  }
}

export function Container(props: ContainerProps = {}): HTMLElement {
  const {
    size = 'lg',
    fluid,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-container', className);

  if (!fluid) {
    el.dataset.size = size;
  } else {
    el.dataset.fluid = '';
  }

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
