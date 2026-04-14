import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { AspectRatioProps } from './AspectRatio.types';
import './AspectRatio.css';

export function AspectRatio(props: AspectRatioProps = {}): HTMLElement {
  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-aspect-ratio', props.class, props.classNames?.root);
  });
  renderEffect(() => {
    el.style.setProperty('--_ratio', String(props.ratio ?? 1));
  });

  if (props.children) el.appendChild(props.children);

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
