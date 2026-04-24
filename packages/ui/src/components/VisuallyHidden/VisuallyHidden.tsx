import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { VisuallyHiddenProps } from './VisuallyHidden.types';
import './VisuallyHidden.css';

export function VisuallyHidden(userProps: VisuallyHiddenProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as VisuallyHiddenProps;

  return adoptElement<HTMLElement>('span', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-visually-hidden', props.class);
    });

    const children = props.children;
    if (children != null) {
      if (typeof children === 'string') {
        if (el.textContent !== children) el.textContent = children;
      } else if (Array.isArray(children)) {
        for (const c of children) if (c.parentNode !== el) el.appendChild(c);
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
