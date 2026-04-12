import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { AnchorProps } from './Anchor.types';
import './Anchor.css';

export function Anchor(userProps: AnchorProps = {}): HTMLAnchorElement {
  const props = { ...useComponentDefaults<AnchorProps>('Anchor'), ...userProps };
  const {
    href,
    target,
    underline = 'hover',
    color,
    size,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('a');
  el.className = mergeClasses('mkt-anchor', className);

  if (href) el.href = href;
  if (target) {
    el.target = target;
    if (target === '_blank') el.rel = 'noopener noreferrer';
  }

  el.dataset.underline = underline;
  if (size) el.dataset.size = size;
  if (color) el.dataset.color = color;

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
