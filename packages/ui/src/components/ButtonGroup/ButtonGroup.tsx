import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { ButtonGroupProps } from './ButtonGroup.types';
import './ButtonGroup.css';

export function ButtonGroup(userProps: ButtonGroupProps = {}): HTMLDivElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ButtonGroupProps;

  const children = props.children;

  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-button-group', props.class);
  });
  el.setAttribute('role', 'group');
  renderEffect(() => { el.dataset.orientation = props.orientation ?? 'horizontal'; });

  if (children) {
    if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLDivElement | null }).current = el;
  }

  return el;
}
