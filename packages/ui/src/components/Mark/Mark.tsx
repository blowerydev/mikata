import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { MarkProps } from './Mark.types';
import './Mark.css';

export function Mark(userProps: MarkProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as MarkProps;

  // `children` is structural — appended once.
  const children = props.children;

  const el = document.createElement('mark');
  renderEffect(() => {
    el.className = mergeClasses('mkt-mark', props.class);
  });
  renderEffect(() => { el.dataset.color = props.color ?? 'yellow'; });

  if (children != null) {
    if (typeof children === 'string') el.textContent = children;
    else el.appendChild(children);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
