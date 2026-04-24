import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { BoxProps } from './Box.types';
import './Box.css';

export function Box(props: BoxProps = {}): HTMLElement {
  return adoptElement<HTMLElement>(props.component ?? 'div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-box', props.class);
    });

    // Reading `props.children` inside the setup callback triggers the
    // JSX getter while the adoption cursor is scoped to `el` - the
    // children adopt from `el`'s subtree. Already-parented children
    // skip the appendChild move.
    const children = props.children;
    if (children) {
      if (Array.isArray(children)) {
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
