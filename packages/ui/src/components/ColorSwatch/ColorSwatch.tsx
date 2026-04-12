import { mergeClasses } from '../../utils/class-merge';
import type { ColorSwatchProps } from './ColorSwatch.types';
import './ColorSwatch.css';

export function ColorSwatch(props: ColorSwatchProps): HTMLElement {
  const {
    color,
    size = 25,
    radius = 'full',
    withShadow,
    onClick,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement(onClick ? 'button' : 'div');
  el.className = mergeClasses('mkt-color-swatch', className);
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  if (withShadow) el.dataset.shadow = '';

  if (typeof radius === 'number') {
    el.style.borderRadius = `${radius}px`;
  } else {
    el.dataset.radius = radius;
  }

  const inner = document.createElement('span');
  inner.className = 'mkt-color-swatch__color';
  inner.style.backgroundColor = color;
  el.appendChild(inner);

  const overlay = document.createElement('span');
  overlay.className = 'mkt-color-swatch__overlay';
  el.appendChild(overlay);

  if (onClick) el.addEventListener('click', onClick as EventListener);
  if (children) {
    const inner2 = document.createElement('span');
    inner2.className = 'mkt-color-swatch__children';
    inner2.appendChild(children);
    el.appendChild(inner2);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
