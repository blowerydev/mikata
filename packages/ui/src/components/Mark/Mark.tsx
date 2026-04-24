import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { MarkProps } from './Mark.types';
import './Mark.css';

export function Mark(userProps: MarkProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as MarkProps;

  return adoptElement<HTMLElement>('mark', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-mark', props.class);
    });
    renderEffect(() => { el.dataset.color = props.color ?? 'yellow'; });

    const children = props.children;
    if (children != null) {
      if (typeof children === 'string') {
        if (el.textContent !== children) el.textContent = children;
      } else if (children.parentNode !== el) {
        el.appendChild(children);
      }
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
