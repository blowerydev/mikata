import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { GridProps } from './Grid.types';
import './Grid.css';

export function Grid(props: GridProps = {}): HTMLElement {
  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-grid', props.class);
  });
  renderEffect(() => {
    el.style.gridTemplateColumns = `repeat(${props.columns ?? 12}, 1fr)`;
  });
  renderEffect(() => {
    if (props.gap) el.dataset.gap = props.gap;
    else delete el.dataset.gap;
  });

  const children = props.children;
  if (children) {
    if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
