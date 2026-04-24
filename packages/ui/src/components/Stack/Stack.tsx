import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { StackProps } from './Stack.types';
import './Stack.css';

export function Stack(props: StackProps = {}): HTMLElement {
  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-stack', props.classNames?.root, props.class);
    });

    renderEffect(() => {
      if (props.direction) el.dataset.direction = props.direction;
      else delete el.dataset.direction;
    });
    renderEffect(() => {
      if (props.gap) el.dataset.gap = props.gap;
      else delete el.dataset.gap;
    });
    renderEffect(() => {
      if (props.wrap) el.dataset.wrap = '';
      else delete el.dataset.wrap;
    });
    renderEffect(() => { el.style.alignItems = props.align ?? ''; });
    renderEffect(() => { el.style.justifyContent = props.justify ?? ''; });

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
