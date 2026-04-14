import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { IndicatorProps } from './Indicator.types';
import './Indicator.css';

export function Indicator(userProps: IndicatorProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as IndicatorProps;

  // `children`, `disabled`, `label` are structural — they decide DOM shape.
  const children = props.children;
  const disabled = props.disabled;
  const label = props.label;

  const root = document.createElement('span');
  renderEffect(() => {
    root.className = mergeClasses('mkt-indicator', props.class, props.classNames?.root);
  });
  renderEffect(() => {
    if (props.inline) root.dataset.inline = '';
    else delete root.dataset.inline;
  });

  if (children) root.appendChild(children);

  if (!disabled) {
    const indicator = document.createElement('span');
    renderEffect(() => {
      indicator.className = mergeClasses('mkt-indicator__indicator', props.classNames?.indicator);
    });
    renderEffect(() => { indicator.dataset.position = props.position ?? 'top-end'; });
    renderEffect(() => { indicator.dataset.color = props.color ?? 'primary'; });
    renderEffect(() => {
      if (props.processing) indicator.dataset.processing = '';
      else delete indicator.dataset.processing;
    });
    renderEffect(() => {
      indicator.style.setProperty('--_indicator-size', `${props.size ?? 10}px`);
    });
    renderEffect(() => {
      indicator.style.setProperty('--_indicator-offset', `${props.offset ?? 0}px`);
    });
    renderEffect(() => {
      const radius = props.radius ?? 'full';
      if (typeof radius === 'number') {
        indicator.style.borderRadius = `${radius}px`;
        delete indicator.dataset.radius;
      } else {
        indicator.style.borderRadius = '';
        indicator.dataset.radius = radius;
      }
    });

    if (label != null) {
      indicator.dataset.withLabel = '';
      renderEffect(() => {
        const l = props.label;
        if (l == null) indicator.replaceChildren();
        else if (l instanceof Node) indicator.replaceChildren(l);
        else indicator.textContent = String(l);
      });
    }

    root.appendChild(indicator);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
