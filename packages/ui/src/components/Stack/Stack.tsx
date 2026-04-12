import { mergeClasses } from '../../utils/class-merge';
import type { StackProps } from './Stack.types';
import './Stack.css';

function appendChildren(parent: HTMLElement, children: Node | Node[] | undefined) {
  if (!children) return;
  if (Array.isArray(children)) {
    for (const child of children) parent.appendChild(child);
  } else {
    parent.appendChild(children);
  }
}

export function Stack(props: StackProps = {}): HTMLElement {
  const {
    direction,
    gap,
    align,
    justify,
    wrap,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-stack', classNames?.root, className);

  if (direction) el.dataset.direction = direction;
  if (gap) el.dataset.gap = gap;
  if (wrap) el.dataset.wrap = '';
  if (align) el.style.alignItems = align;
  if (justify) el.style.justifyContent = justify;

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
