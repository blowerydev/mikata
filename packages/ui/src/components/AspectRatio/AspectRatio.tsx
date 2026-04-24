import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { AspectRatioProps } from './AspectRatio.types';
import './AspectRatio.css';

export function AspectRatio(props: AspectRatioProps = {}): HTMLElement {
  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-aspect-ratio', props.class, props.classNames?.root);
    });
    renderEffect(() => {
      el.style.setProperty('--_ratio', String(props.ratio ?? 1));
    });

    const children = props.children;
    if (children && children.parentNode !== el) el.appendChild(children);

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
