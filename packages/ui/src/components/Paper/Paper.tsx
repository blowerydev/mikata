import { mergeClasses } from '../../utils/class-merge';
import type { PaperProps } from './Paper.types';
import './Paper.css';

export function Paper(props: PaperProps = {}): HTMLElement {
  const {
    shadow,
    radius = 'sm',
    padding = 'md',
    withBorder,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses(
    'mkt-paper',
    withBorder && 'mkt-paper--bordered',
    className,
    classNames?.root,
  );
  if (shadow) el.dataset.shadow = shadow;
  el.dataset.radius = radius;
  el.dataset.padding = padding;

  if (children) {
    if (Array.isArray(children)) {
      for (const c of children) el.appendChild(c);
    } else {
      el.appendChild(children);
    }
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
