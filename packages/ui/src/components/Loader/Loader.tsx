import { mergeClasses } from '../../utils/class-merge';
import type { LoaderProps } from './Loader.types';
import './Loader.css';

export function Loader(props: LoaderProps = {}): HTMLElement {
  const {
    size = 'md',
    color,
    class: className,
    ref,
  } = props;

  const el = document.createElement('span');
  el.className = mergeClasses('mkt-loader', className);
  el.setAttribute('role', 'status');

  el.dataset.size = size;
  if (color) el.dataset.color = color;

  // Screen-reader accessible loading text
  const srText = document.createElement('span');
  srText.className = 'mkt-loader__sr-only';
  srText.textContent = 'Loading...';
  el.appendChild(srText);

  if (ref) {
    if (typeof ref === 'function') {
      ref(el);
    } else {
      (ref as any).current = el;
    }
  }

  return el;
}
