import { mergeClasses } from '../../utils/class-merge';
import type { CenterProps } from './Center.types';
import './Center.css';

export function Center(props: CenterProps = {}): HTMLElement {
  const { inline, classNames, children, class: className, ref } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-center', className, classNames?.root);
  if (inline) el.dataset.inline = '';

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
