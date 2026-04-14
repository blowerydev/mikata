import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { CodeProps } from './Code.types';
import './Code.css';

export function Code(userProps: CodeProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as CodeProps;

  // `block`, `children` are structural — tag choice and content set once.
  const block = props.block;
  const children = props.children;

  let el: HTMLElement;
  if (block) {
    el = document.createElement('pre');
    renderEffect(() => {
      el.className = mergeClasses('mkt-code', 'mkt-code--block', props.class);
    });
    const code = document.createElement('code');
    if (children != null) {
      if (typeof children === 'string') code.textContent = children;
      else code.appendChild(children);
    }
    el.appendChild(code);
  } else {
    el = document.createElement('code');
    renderEffect(() => {
      el.className = mergeClasses('mkt-code', props.class);
    });
    if (children != null) {
      if (typeof children === 'string') el.textContent = children;
      else el.appendChild(children);
    }
  }

  renderEffect(() => {
    if (props.color) el.dataset.color = props.color;
    else delete el.dataset.color;
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
