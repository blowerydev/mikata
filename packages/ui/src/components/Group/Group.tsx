import { mergeClasses } from '../../utils/class-merge';
import type { GroupProps } from './Group.types';
import './Group.css';

function appendChildren(parent: HTMLElement, children: Node | Node[] | undefined) {
  if (!children) return;
  if (Array.isArray(children)) {
    for (const child of children) parent.appendChild(child);
  } else {
    parent.appendChild(children);
  }
}

export function Group(props: GroupProps = {}): HTMLElement {
  const {
    gap,
    align,
    justify,
    wrap,
    grow,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-group', classNames?.root, className);

  if (gap) el.dataset.gap = gap;
  if (wrap) el.dataset.wrap = '';
  if (grow) el.dataset.grow = '';
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
