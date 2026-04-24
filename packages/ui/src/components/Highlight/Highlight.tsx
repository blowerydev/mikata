import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { HighlightProps } from './Highlight.types';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function Highlight(userProps: HighlightProps): HTMLSpanElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as HighlightProps;

  // `children`, `highlight`, `color` are structural - the split/mark
  // tree is built once at setup. On hydration the adopted span already
  // has the same tree from SSR, so skip rebuilding and avoid blowing
  // away the adopted children.
  const children = props.children;
  const highlight = props.highlight;
  const color = props.color ?? 'yellow';

  return adoptElement<HTMLSpanElement>('span', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-highlight', props.class);
    });

    // Skip the rebuild if children are already in place (SSR path).
    // The shape is a pure function of props, so SSR output matches
    // what we'd build fresh client-side.
    if (!el.firstChild) {
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
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLSpanElement | null }).current = el;
    }
  });
}
