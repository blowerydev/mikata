import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { ColorSwatchProps } from './ColorSwatch.types';
import './ColorSwatch.css';

export function ColorSwatch(props: ColorSwatchProps): HTMLElement {
  // The tag (button vs div) is fixed at setup - `onClick` presence
  // decides once.
  const onClick = props.onClick;
  const tag = onClick ? 'button' : 'div';

  return adoptElement<HTMLElement>(tag, (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-color-swatch', props.class);
    });

    renderEffect(() => {
      const size = props.size ?? 25;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
    });

    renderEffect(() => {
      if (props.withShadow) el.dataset.shadow = '';
      else delete el.dataset.shadow;
    });

    renderEffect(() => {
      const radius = props.radius ?? 'full';
      if (typeof radius === 'number') {
        delete el.dataset.radius;
        el.style.borderRadius = `${radius}px`;
      } else {
        el.style.borderRadius = '';
        el.dataset.radius = radius;
      }
    });

    adoptElement<HTMLSpanElement>('span', (inner) => {
      inner.className = 'mkt-color-swatch__color';
      renderEffect(() => { inner.style.backgroundColor = props.color; });
    });

    adoptElement<HTMLSpanElement>('span', (overlay) => {
      overlay.className = 'mkt-color-swatch__overlay';
    });

    if (onClick) el.addEventListener('click', onClick as EventListener);

    if (props.children) {
      adoptElement<HTMLSpanElement>('span', (inner2) => {
        inner2.className = 'mkt-color-swatch__children';
        if (props.children && props.children.parentNode !== inner2) {
          inner2.appendChild(props.children);
        }
      });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
