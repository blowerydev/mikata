import { mergeClasses } from '../../utils/class-merge';
import type { OverlayProps } from './Overlay.types';
import './Overlay.css';

export function Overlay(props: OverlayProps = {}): HTMLDivElement {
  const {
    color = '#000',
    opacity = 0.6,
    blur = 0,
    fixed,
    zIndex,
    radius,
    children,
    onClick,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-overlay', className);
  if (fixed) el.dataset.fixed = '';
  el.style.setProperty('--_overlay-color', color);
  el.style.setProperty('--_overlay-opacity', String(opacity));
  if (blur) el.style.setProperty('--_overlay-blur', `${blur}px`);
  if (zIndex != null) el.style.zIndex = typeof zIndex === 'number' ? String(zIndex) : zIndex;
  if (radius != null) el.style.borderRadius = typeof radius === 'number' ? `${radius}px` : radius;

  if (children) {
    const content = document.createElement('div');
    content.className = 'mkt-overlay__content';
    content.appendChild(children);
    el.appendChild(content);
  }

  if (onClick) el.addEventListener('click', (e) => onClick(e as MouseEvent));

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }
  return el;
}
