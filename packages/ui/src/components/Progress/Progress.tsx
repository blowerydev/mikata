import { mergeClasses } from '../../utils/class-merge';
import type { ProgressProps } from './Progress.types';
import './Progress.css';

export function Progress(props: ProgressProps): HTMLElement {
  const {
    value,
    size = 'md',
    color = 'primary',
    striped,
    animated,
    label,
    classNames,
    class: className,
    ref,
  } = props;

  const clamped = Math.max(0, Math.min(100, value));

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-progress', classNames?.root, className);
  el.dataset.size = size;
  el.dataset.color = color;
  el.setAttribute('role', 'progressbar');
  el.setAttribute('aria-valuenow', String(clamped));
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '100');

  const bar = document.createElement('div');
  bar.className = mergeClasses('mkt-progress__bar', classNames?.bar);
  bar.style.width = `${clamped}%`;
  if (striped || animated) bar.dataset.striped = '';
  if (animated) bar.dataset.animated = '';

  if (label) {
    const labelEl = document.createElement('span');
    labelEl.className = mergeClasses('mkt-progress__label', classNames?.label);
    labelEl.textContent = label;
    bar.appendChild(labelEl);
  }

  el.appendChild(bar);

  if (ref) {
    if (typeof ref === 'function') {
      ref(el);
    } else {
      (ref as any).current = el;
    }
  }

  return el;
}
