import { mergeClasses } from '../../utils/class-merge';
import type { FieldsetProps } from './Fieldset.types';
import './Fieldset.css';

export function Fieldset(props: FieldsetProps = {}): HTMLFieldSetElement {
  const {
    legend,
    variant = 'default',
    disabled,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('fieldset');
  el.className = mergeClasses('mkt-fieldset', className, classNames?.root);
  el.dataset.variant = variant;
  if (disabled) el.disabled = true;

  if (legend != null) {
    const legendEl = document.createElement('legend');
    legendEl.className = mergeClasses('mkt-fieldset__legend', classNames?.legend);
    if (legend instanceof Node) legendEl.appendChild(legend);
    else legendEl.textContent = legend;
    el.appendChild(legendEl);
  }

  if (children) {
    if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el as any);
    else (ref as any).current = el;
  }

  return el;
}
