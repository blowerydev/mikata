import { mergeClasses } from '../../utils/class-merge';
import type { CodeProps } from './Code.types';
import './Code.css';

export function Code(props: CodeProps = {}): HTMLElement {
  const { block, color, children, class: className, ref } = props;

  let el: HTMLElement;
  if (block) {
    el = document.createElement('pre');
    el.className = mergeClasses('mkt-code', 'mkt-code--block', className);
    const code = document.createElement('code');
    if (children != null) {
      if (typeof children === 'string') code.textContent = children;
      else code.appendChild(children);
    }
    el.appendChild(code);
  } else {
    el = document.createElement('code');
    el.className = mergeClasses('mkt-code', className);
    if (children != null) {
      if (typeof children === 'string') el.textContent = children;
      else el.appendChild(children);
    }
  }

  if (color) el.dataset.color = color;

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
