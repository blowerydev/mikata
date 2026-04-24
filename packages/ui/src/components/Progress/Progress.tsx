import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { ProgressProps } from './Progress.types';
import './Progress.css';

export function Progress(userProps: ProgressProps): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<ProgressProps>('Progress') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as ProgressProps;

  const hasLabel = props.label != null;

  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-progress', props.classNames?.root, props.class);
    });
    renderEffect(() => { el.dataset.size = props.size ?? 'md'; });
    renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });
    el.setAttribute('role', 'progressbar');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    renderEffect(() => {
      const clamped = Math.max(0, Math.min(100, props.value));
      el.setAttribute('aria-valuenow', String(clamped));
    });

    adoptElement<HTMLDivElement>('div', (bar) => {
      renderEffect(() => {
        bar.className = mergeClasses('mkt-progress__bar', props.classNames?.bar);
      });
      renderEffect(() => {
        const clamped = Math.max(0, Math.min(100, props.value));
        bar.style.width = `${clamped}%`;
      });
      renderEffect(() => {
        if (props.striped || props.animated) bar.dataset.striped = '';
        else delete bar.dataset.striped;
        if (props.animated) bar.dataset.animated = '';
        else delete bar.dataset.animated;
      });

      if (hasLabel) {
        adoptElement<HTMLSpanElement>('span', (labelEl) => {
          renderEffect(() => {
            labelEl.className = mergeClasses('mkt-progress__label', props.classNames?.label);
          });
          renderEffect(() => { labelEl.textContent = props.label ?? ''; });
        });
      }
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
