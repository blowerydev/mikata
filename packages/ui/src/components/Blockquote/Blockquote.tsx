import { mergeClasses } from '../../utils/class-merge';
import type { BlockquoteProps } from './Blockquote.types';
import './Blockquote.css';

export function Blockquote(props: BlockquoteProps = {}): HTMLElement {
  const { color = 'primary', cite, icon, classNames, children, class: className, ref } = props;

  const el = document.createElement('blockquote');
  el.className = mergeClasses('mkt-blockquote', className, classNames?.root);
  el.dataset.color = color;

  if (icon) {
    const iconWrap = document.createElement('span');
    iconWrap.className = mergeClasses('mkt-blockquote__icon', classNames?.icon);
    iconWrap.appendChild(icon);
    el.appendChild(iconWrap);
  }

  const body = document.createElement('div');
  body.className = 'mkt-blockquote__body';
  if (children != null) {
    if (typeof children === 'string') body.textContent = children;
    else body.appendChild(children);
  }
  el.appendChild(body);

  if (cite != null) {
    const citeEl = document.createElement('cite');
    citeEl.className = mergeClasses('mkt-blockquote__cite', classNames?.cite);
    if (cite instanceof Node) citeEl.appendChild(cite);
    else citeEl.textContent = cite;
    el.appendChild(citeEl);
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
