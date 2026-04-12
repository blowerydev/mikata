import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { TextProps } from './Text.types';
import './Text.css';

export function Text(userProps: TextProps = {}): HTMLElement {
  const props = { ...useComponentDefaults<TextProps>('Text'), ...userProps };
  const {
    size = 'md',
    weight,
    color,
    truncate,
    lineClamp,
    inline,
    component = 'p',
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement(component);
  el.className = mergeClasses('mkt-text', className);

  el.dataset.size = size;

  if (weight) el.dataset.weight = weight;
  if (color) el.dataset.color = color;
  if (inline) el.dataset.inline = '';
  if (truncate) el.dataset.truncate = '';

  if (lineClamp != null) {
    el.dataset.lineClamp = '';
    el.style.setProperty('-webkit-line-clamp', String(lineClamp));
  }

  if (children != null) {
    if (typeof children === 'string') {
      el.textContent = children;
    } else {
      el.appendChild(children);
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
