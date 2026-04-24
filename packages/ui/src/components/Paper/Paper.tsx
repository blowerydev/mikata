import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { PaperProps } from './Paper.types';
import './Paper.css';

export function Paper(props: PaperProps = {}): HTMLElement {
  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses(
        'mkt-paper',
        props.withBorder && 'mkt-paper--bordered',
        props.class,
        props.classNames?.root,
      );
    });
    renderEffect(() => {
      if (props.shadow) el.dataset.shadow = props.shadow;
      else delete el.dataset.shadow;
    });
    renderEffect(() => { el.dataset.radius = props.radius ?? 'sm'; });
    renderEffect(() => { el.dataset.padding = props.padding ?? 'md'; });

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
