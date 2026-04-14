import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { ColorSwatchProps } from './ColorSwatch.types';
import './ColorSwatch.css';

export function ColorSwatch(props: ColorSwatchProps): HTMLElement {
  // The tag (button vs div) is fixed at setup — we read `onClick` once to
  // decide, then wire the handler if present.
  const onClick = props.onClick;
  const el = document.createElement(onClick ? 'button' : 'div');
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

  const inner = document.createElement('span');
  inner.className = 'mkt-color-swatch__color';
  renderEffect(() => { inner.style.backgroundColor = props.color; });
  el.appendChild(inner);

  const overlay = document.createElement('span');
  overlay.className = 'mkt-color-swatch__overlay';
  el.appendChild(overlay);

  if (onClick) el.addEventListener('click', onClick as EventListener);

  if (props.children) {
    const inner2 = document.createElement('span');
    inner2.className = 'mkt-color-swatch__children';
    inner2.appendChild(props.children);
    el.appendChild(inner2);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
