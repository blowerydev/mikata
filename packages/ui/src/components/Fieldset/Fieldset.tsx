import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { FieldsetProps } from './Fieldset.types';
import './Fieldset.css';

export function Fieldset(userProps: FieldsetProps = {}): HTMLFieldSetElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as FieldsetProps;

  // `legend`, `children` are structural — decide sub-elements.
  const legend = props.legend;
  const children = props.children;

  const el = document.createElement('fieldset');
  renderEffect(() => {
    el.className = mergeClasses('mkt-fieldset', props.class, props.classNames?.root);
  });
  renderEffect(() => { el.dataset.variant = props.variant ?? 'default'; });
  renderEffect(() => { el.disabled = !!props.disabled; });

  if (legend != null) {
    const legendEl = document.createElement('legend');
    renderEffect(() => {
      legendEl.className = mergeClasses('mkt-fieldset__legend', props.classNames?.legend);
    });
    if (legend instanceof Node) legendEl.appendChild(legend);
    else legendEl.textContent = legend;
    el.appendChild(legendEl);
  }

  if (children) {
    if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLFieldSetElement | null }).current = el;
  }

  return el;
}
