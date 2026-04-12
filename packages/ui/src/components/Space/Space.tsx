import { mergeClasses } from '../../utils/class-merge';
import type { SpaceProps } from './Space.types';
import './Space.css';

export function Space(props: SpaceProps = {}): HTMLElement {
  const {
    size = 'md',
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-space', className);
  el.dataset.size = size;

  if (ref) {
    if (typeof ref === 'function') {
      ref(el);
    } else {
      (ref as any).current = el;
    }
  }

  return el;
}
