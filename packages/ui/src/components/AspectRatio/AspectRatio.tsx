import { mergeClasses } from '../../utils/class-merge';
import type { AspectRatioProps } from './AspectRatio.types';
import './AspectRatio.css';

export function AspectRatio(props: AspectRatioProps = {}): HTMLElement {
  const { ratio = 1, classNames, children, class: className, ref } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-aspect-ratio', className, classNames?.root);
  el.style.setProperty('--_ratio', String(ratio));

  if (children) el.appendChild(children);

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
