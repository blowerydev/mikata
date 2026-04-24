import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { SkeletonProps } from './Skeleton.types';
import './Skeleton.css';

export function Skeleton(userProps: SkeletonProps = {}): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as SkeletonProps;

  // `visible`, `children`, `circle` are structural - they decide
  // whether the skeleton or the children are shown, and whether the
  // shape is circular.
  const visible = props.visible ?? true;
  const children = props.children;
  const circle = props.circle;

  if (!visible && children) {
    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(children as HTMLElement);
      else (ref as { current: unknown }).current = children;
    }
    return children as HTMLElement;
  }

  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-skeleton', props.class);
    });

    if (circle) {
      renderEffect(() => {
        const size = props.width || props.height || '40px';
        el.style.width = size;
        el.style.height = size;
      });
      el.dataset.radius = 'full';
    } else {
      renderEffect(() => {
        if (props.height) el.style.height = props.height;
        else el.style.height = '';
      });
      renderEffect(() => {
        if (props.width) el.style.width = props.width;
        else el.style.width = '';
      });
      renderEffect(() => { el.dataset.radius = props.radius ?? 'md'; });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
