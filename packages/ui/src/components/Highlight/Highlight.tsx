import { mergeClasses } from '../../utils/class-merge';
import type { HighlightProps } from './Highlight.types';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function Highlight(props: HighlightProps): HTMLSpanElement {
  const { children, highlight, color = 'yellow', class: className, ref } = props;

  const el = document.createElement('span');
  el.className = mergeClasses('mkt-highlight', className);

  const terms = Array.isArray(highlight) ? highlight : [highlight];
  const filtered = terms.filter((t) => t && t.length > 0);

  if (filtered.length === 0) {
    el.textContent = children;
  } else {
    const re = new RegExp(`(${filtered.map(escapeRegExp).join('|')})`, 'gi');
    const parts = children.split(re);
    for (const part of parts) {
      if (filtered.some((t) => part.toLowerCase() === t.toLowerCase())) {
        const mark = document.createElement('mark');
        mark.className = 'mkt-mark';
        mark.dataset.color = color;
        mark.textContent = part;
        el.appendChild(mark);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    }
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
