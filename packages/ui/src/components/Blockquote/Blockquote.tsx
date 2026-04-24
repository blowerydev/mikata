import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { BlockquoteProps } from './Blockquote.types';
import './Blockquote.css';

export function Blockquote(props: BlockquoteProps = {}): HTMLElement {
  return adoptElement<HTMLElement>('blockquote', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-blockquote', props.class, props.classNames?.root);
    });
    renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });

    // Icon slot - always in the tree, hidden when no icon provided.
    // Stable structure means SSR and client see the same children and
    // adoption stays in sync.
    adoptElement<HTMLSpanElement>('span', (iconWrap) => {
      renderEffect(() => {
        iconWrap.className = mergeClasses('mkt-blockquote__icon', props.classNames?.icon);
      });
      renderEffect(() => {
        iconWrap.replaceChildren();
        const icon = props.icon;
        if (icon) iconWrap.appendChild(icon);
        iconWrap.hidden = !icon;
      });
    });

    adoptElement<HTMLDivElement>('div', (body) => {
      body.className = 'mkt-blockquote__body';
      renderEffect(() => {
        const c = props.children;
        if (c == null) body.textContent = '';
        else if (typeof c === 'string') body.textContent = c;
        else body.replaceChildren(c);
      });
    });

    adoptElement<HTMLElement>('cite', (citeEl) => {
      renderEffect(() => {
        citeEl.className = mergeClasses('mkt-blockquote__cite', props.classNames?.cite);
      });
      renderEffect(() => {
        const cite = props.cite;
        citeEl.replaceChildren();
        if (cite == null) {
          citeEl.hidden = true;
        } else {
          if (cite instanceof Node) citeEl.appendChild(cite);
          else citeEl.textContent = cite;
          citeEl.hidden = false;
        }
      });
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
