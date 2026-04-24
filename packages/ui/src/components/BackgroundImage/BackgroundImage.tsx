import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { BackgroundImageProps } from './BackgroundImage.types';
import './BackgroundImage.css';

export function BackgroundImage(userProps: BackgroundImageProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as BackgroundImageProps;

  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-background-image', props.class);
    });
    renderEffect(() => {
      el.style.backgroundImage = `url("${props.src.replace(/"/g, '\\"')}")`;
    });

    renderEffect(() => {
      const radius = props.radius;
      if (radius == null) {
        el.style.borderRadius = '';
        delete el.dataset.radius;
      } else if (typeof radius === 'number') {
        el.style.borderRadius = `${radius}px`;
        delete el.dataset.radius;
      } else {
        el.style.borderRadius = '';
        el.dataset.radius = radius;
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
