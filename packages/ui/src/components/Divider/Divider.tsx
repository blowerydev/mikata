import { mergeClasses } from '../../utils/class-merge';
import type { DividerProps } from './Divider.types';
import './Divider.css';

export function Divider(props: DividerProps = {}): HTMLElement {
  const {
    orientation = 'horizontal',
    color,
    label,
    labelPosition = 'center',
    class: className,
    ref,
  } = props;

  if (label && orientation === 'horizontal') {
    // Labeled divider uses a div with flex lines
    const el = document.createElement('div');
    el.className = mergeClasses('mkt-divider', className);
    el.dataset.orientation = orientation;
    el.dataset.hasLabel = '';
    el.dataset.labelPosition = labelPosition;
    el.setAttribute('role', 'separator');

    const lineBefore = document.createElement('span');
    lineBefore.className = 'mkt-divider__line';

    const labelEl = document.createElement('span');
    labelEl.className = 'mkt-divider__label';
    labelEl.textContent = label;

    const lineAfter = document.createElement('span');
    lineAfter.className = 'mkt-divider__line';

    if (color) {
      lineBefore.style.backgroundColor = color;
      lineAfter.style.backgroundColor = color;
    }

    el.appendChild(lineBefore);
    el.appendChild(labelEl);
    el.appendChild(lineAfter);

    if (ref) {
      if (typeof ref === 'function') {
        ref(el);
      } else {
        (ref as any).current = el;
      }
    }

    return el;
  }

  // Simple divider (no label)
  const el = document.createElement(orientation === 'horizontal' ? 'hr' : 'div');
  el.className = mergeClasses('mkt-divider', className);
  el.dataset.orientation = orientation;
  el.setAttribute('role', 'separator');

  if (color) {
    if (orientation === 'horizontal') {
      el.style.borderTopColor = color;
    } else {
      el.style.borderLeftColor = color;
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
