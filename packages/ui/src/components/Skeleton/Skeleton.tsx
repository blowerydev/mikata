import { mergeClasses } from '../../utils/class-merge';
import type { SkeletonProps } from './Skeleton.types';
import './Skeleton.css';

export function Skeleton(props: SkeletonProps = {}): HTMLElement {
  const {
    height,
    width,
    radius = 'md',
    circle,
    visible = true,
    children,
    class: className,
    ref,
  } = props;

  // If not visible, return children directly (or empty span)
  if (!visible && children) {
    if (ref) {
      if (typeof ref === 'function') {
        ref(children as HTMLElement);
      } else {
        (ref as any).current = children;
      }
    }
    return children as HTMLElement;
  }

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-skeleton', className);

  if (circle) {
    const size = width || height || '40px';
    el.style.width = size;
    el.style.height = size;
    el.dataset.radius = 'full';
  } else {
    if (height) el.style.height = height;
    if (width) el.style.width = width;
    el.dataset.radius = radius;
  }

  if (ref) {
    if (typeof ref === 'function') {
      ref(el);
    } else {
      (ref as any).current = el;
    }
  }

  return el;
}
