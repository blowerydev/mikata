import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { OverlayProps } from './Overlay.types';
import './Overlay.css';

export function Overlay(userProps: OverlayProps = {}): HTMLDivElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as OverlayProps;

  // `children`, `onClick` are structural — decide DOM shape and listeners.
  const children = props.children;
  const onClick = props.onClick;

  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-overlay', props.class);
  });
  renderEffect(() => {
    if (props.fixed) el.dataset.fixed = '';
    else delete el.dataset.fixed;
  });
  renderEffect(() => { el.style.setProperty('--_overlay-color', props.color ?? '#000'); });
  renderEffect(() => { el.style.setProperty('--_overlay-opacity', String(props.opacity ?? 0.6)); });
  renderEffect(() => {
    const blur = props.blur ?? 0;
    if (blur) el.style.setProperty('--_overlay-blur', `${blur}px`);
    else el.style.removeProperty('--_overlay-blur');
  });
  renderEffect(() => {
    const z = props.zIndex;
    if (z != null) el.style.zIndex = typeof z === 'number' ? String(z) : z;
    else el.style.zIndex = '';
  });
  renderEffect(() => {
    const r = props.radius;
    if (r != null) el.style.borderRadius = typeof r === 'number' ? `${r}px` : r;
    else el.style.borderRadius = '';
  });

  if (children) {
    const content = document.createElement('div');
    content.className = 'mkt-overlay__content';
    content.appendChild(children);
    el.appendChild(content);
  }

  if (onClick) el.addEventListener('click', (e) => onClick(e as MouseEvent));

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLDivElement | null }).current = el;
  }
  return el;
}
