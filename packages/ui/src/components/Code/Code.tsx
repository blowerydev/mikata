import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { CodeProps } from './Code.types';
import './Code.css';

export function Code(userProps: CodeProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as CodeProps;

  // `block`, `children` are structural - tag choice and content set
  // once at setup. Block mode produces <pre><code>..</code></pre>;
  // inline mode is a lone <code>.
  const block = props.block;
  const children = props.children;

  function assignChildren(host: HTMLElement) {
    if (children == null) return;
    if (typeof children === 'string') {
      if (host.textContent !== children) host.textContent = children;
    } else if (children.parentNode !== host) {
      host.appendChild(children);
    }
  }

  if (block) {
    return adoptElement<HTMLElement>('pre', (pre) => {
      renderEffect(() => {
        pre.className = mergeClasses('mkt-code', 'mkt-code--block', props.class);
      });
      renderEffect(() => {
        if (props.color) pre.dataset.color = props.color;
        else delete pre.dataset.color;
      });
      adoptElement<HTMLElement>('code', (code) => {
        assignChildren(code);
      });

      const ref = props.ref;
      if (ref) {
        if (typeof ref === 'function') ref(pre);
        else (ref as { current: HTMLElement | null }).current = pre;
      }
    });
  }

  return adoptElement<HTMLElement>('code', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-code', props.class);
    });
    renderEffect(() => {
      if (props.color) el.dataset.color = props.color;
      else delete el.dataset.color;
    });
    assignChildren(el);

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
