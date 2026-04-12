import { mergeClasses } from '../../utils/class-merge';
import type { ButtonGroupProps } from './ButtonGroup.types';
import './ButtonGroup.css';

export function ButtonGroup(props: ButtonGroupProps = {}): HTMLDivElement {
  const {
    orientation = 'horizontal',
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-button-group', className);
  el.setAttribute('role', 'group');
  el.dataset.orientation = orientation;

  if (children) {
    if (Array.isArray(children)) {
      for (const child of children) {
        el.appendChild(child);
      }
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
