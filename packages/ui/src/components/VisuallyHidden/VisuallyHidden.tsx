import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { VisuallyHiddenProps } from './VisuallyHidden.types';
import './VisuallyHidden.css';

export function VisuallyHidden(userProps: VisuallyHiddenProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as VisuallyHiddenProps;

  const children = props.children;

  const el = document.createElement('span');
  renderEffect(() => {
    el.className = mergeClasses('mkt-visually-hidden', props.class);
  });

  if (children != null) {
    if (typeof children === 'string') el.textContent = children;
    else if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
