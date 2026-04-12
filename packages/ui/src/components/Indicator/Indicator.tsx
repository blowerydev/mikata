import { mergeClasses } from '../../utils/class-merge';
import type { IndicatorProps } from './Indicator.types';
import './Indicator.css';

export function Indicator(props: IndicatorProps = {}): HTMLElement {
  const {
    label,
    size = 10,
    offset = 0,
    position = 'top-end',
    color = 'primary',
    disabled,
    processing,
    inline,
    radius = 'full',
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const root = document.createElement('span');
  root.className = mergeClasses('mkt-indicator', className, classNames?.root);
  if (inline) root.dataset.inline = '';

  if (children) root.appendChild(children);

  if (!disabled) {
    const indicator = document.createElement('span');
    indicator.className = mergeClasses('mkt-indicator__indicator', classNames?.indicator);
    indicator.dataset.position = position;
    indicator.dataset.color = color;
    if (processing) indicator.dataset.processing = '';
    indicator.style.setProperty('--_indicator-size', `${size}px`);
    indicator.style.setProperty('--_indicator-offset', `${offset}px`);
    if (typeof radius === 'number') indicator.style.borderRadius = `${radius}px`;
    else indicator.dataset.radius = radius;

    if (label != null) {
      indicator.dataset.withLabel = '';
      if (label instanceof Node) indicator.appendChild(label);
      else indicator.textContent = String(label);
    }

    root.appendChild(indicator);
  }

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
