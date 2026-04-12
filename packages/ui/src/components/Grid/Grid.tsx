import { mergeClasses } from '../../utils/class-merge';
import type { GridProps } from './Grid.types';
import './Grid.css';

function appendChildren(parent: HTMLElement, children: Node | Node[] | undefined) {
  if (!children) return;
  if (Array.isArray(children)) {
    for (const child of children) parent.appendChild(child);
  } else {
    parent.appendChild(children);
  }
}

export function Grid(props: GridProps = {}): HTMLElement {
  const {
    columns = 12,
    gap,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-grid', className);

  el.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

  if (gap) el.dataset.gap = gap;

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
