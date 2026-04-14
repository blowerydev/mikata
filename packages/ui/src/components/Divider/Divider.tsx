import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { DividerProps } from './Divider.types';
import './Divider.css';

export function Divider(props: DividerProps = {}): HTMLElement {
  // Tag choice (hr vs div) and the labeled-vs-plain structure are set at
  // setup — `orientation` and `label` presence read once. `label` text itself
  // is reactive once we're in the labeled branch.
  const orientation = props.orientation ?? 'horizontal';
  const hasLabel = props.label != null && orientation === 'horizontal';

  if (hasLabel) {
    const el = document.createElement('div');
    renderEffect(() => {
      el.className = mergeClasses('mkt-divider', props.class);
    });
    el.dataset.orientation = orientation;
    el.dataset.hasLabel = '';
    renderEffect(() => { el.dataset.labelPosition = props.labelPosition ?? 'center'; });
    el.setAttribute('role', 'separator');

    const lineBefore = document.createElement('span');
    lineBefore.className = 'mkt-divider__line';
    const labelEl = document.createElement('span');
    labelEl.className = 'mkt-divider__label';
    renderEffect(() => {
      const l = props.label;
      labelEl.textContent = l == null ? '' : l;
    });
    const lineAfter = document.createElement('span');
    lineAfter.className = 'mkt-divider__line';
    renderEffect(() => {
      const c = props.color ?? '';
      lineBefore.style.backgroundColor = c;
      lineAfter.style.backgroundColor = c;
    });

    el.appendChild(lineBefore);
    el.appendChild(labelEl);
    el.appendChild(lineAfter);

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
    return el;
  }

  // Simple divider (no label)
  const el = document.createElement(orientation === 'horizontal' ? 'hr' : 'div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-divider', props.class);
  });
  el.dataset.orientation = orientation;
  el.setAttribute('role', 'separator');

  renderEffect(() => {
    const c = props.color ?? '';
    if (orientation === 'horizontal') el.style.borderTopColor = c;
    else el.style.borderLeftColor = c;
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }
  return el;
}
