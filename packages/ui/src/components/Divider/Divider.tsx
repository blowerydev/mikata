import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { DividerProps } from './Divider.types';
import './Divider.css';

export function Divider(props: DividerProps = {}): HTMLElement {
  // Tag choice (hr vs div) and the labeled-vs-plain structure are set
  // at setup — `orientation` and `label` presence read once. `label`
  // text itself is reactive once we're in the labeled branch.
  const orientation = props.orientation ?? 'horizontal';
  const hasLabel = props.label != null && orientation === 'horizontal';

  if (hasLabel) {
    return adoptElement<HTMLElement>('div', (el) => {
      renderEffect(() => {
        el.className = mergeClasses('mkt-divider', props.class);
      });
      el.dataset.orientation = orientation;
      el.dataset.hasLabel = '';
      renderEffect(() => { el.dataset.labelPosition = props.labelPosition ?? 'center'; });
      el.setAttribute('role', 'separator');

      adoptElement<HTMLSpanElement>('span', (lineBefore) => {
        lineBefore.className = 'mkt-divider__line';
        renderEffect(() => {
          lineBefore.style.backgroundColor = props.color ?? '';
        });
      });
      adoptElement<HTMLSpanElement>('span', (labelEl) => {
        labelEl.className = 'mkt-divider__label';
        renderEffect(() => {
          const l = props.label;
          labelEl.textContent = l == null ? '' : l;
        });
      });
      adoptElement<HTMLSpanElement>('span', (lineAfter) => {
        lineAfter.className = 'mkt-divider__line';
        renderEffect(() => {
          lineAfter.style.backgroundColor = props.color ?? '';
        });
      });

      const ref = props.ref;
      if (ref) {
        if (typeof ref === 'function') ref(el);
        else (ref as { current: HTMLElement | null }).current = el;
      }
    });
  }

  // Simple divider (no label)
  return adoptElement<HTMLElement>(
    orientation === 'horizontal' ? 'hr' : 'div',
    (el) => {
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
    },
  );
}
