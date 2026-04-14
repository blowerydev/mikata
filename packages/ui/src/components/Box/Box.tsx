import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { BoxProps } from './Box.types';
import './Box.css';

export function Box(props: BoxProps = {}): HTMLElement {
  const el = document.createElement(props.component ?? 'div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-box', props.class);
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
