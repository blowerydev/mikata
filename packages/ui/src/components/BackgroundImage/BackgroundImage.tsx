import { mergeClasses } from '../../utils/class-merge';
import type { BackgroundImageProps } from './BackgroundImage.types';
import './BackgroundImage.css';

export function BackgroundImage(props: BackgroundImageProps): HTMLElement {
  const { src, radius, children, class: className, ref } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-background-image', className);
  el.style.backgroundImage = `url("${src.replace(/"/g, '\\"')}")`;

  if (radius != null) {
    if (typeof radius === 'number') el.style.borderRadius = `${radius}px`;
    else el.dataset.radius = radius;
  }

  if (children) {
    if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
