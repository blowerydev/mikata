import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { ContainerProps } from './Container.types';
import './Container.css';

export function Container(props: ContainerProps = {}): HTMLElement {
  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-container', props.class);
    });

    renderEffect(() => {
      if (props.fluid) {
        delete el.dataset.size;
        el.dataset.fluid = '';
      } else {
        delete el.dataset.fluid;
        el.dataset.size = props.size ?? 'lg';
      }
    });

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
