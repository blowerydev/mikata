import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { ScrollAreaProps } from './ScrollArea.types';
import './ScrollArea.css';

function resolveSize(v: string | number | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

export function ScrollArea(userProps: ScrollAreaProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ScrollAreaProps;

  return adoptElement<HTMLElement>('div', (root) => {
    renderEffect(() => {
      root.className = mergeClasses('mkt-scroll-area', props.class, props.classNames?.root);
    });
    renderEffect(() => { root.dataset.type = props.type ?? 'hover'; });
    renderEffect(() => { root.dataset.direction = props.direction ?? 'vertical'; });
    renderEffect(() => {
      if (props.offsetScrollbars) root.dataset.offset = '';
      else delete root.dataset.offset;
    });
    renderEffect(() => {
      root.style.setProperty('--_scrollbar-size', `${props.scrollbarSize ?? 10}px`);
    });
    renderEffect(() => {
      const w = resolveSize(props.width);
      if (w) root.style.width = w;
      else root.style.removeProperty('width');
    });
    renderEffect(() => {
      const h = resolveSize(props.height);
      if (h) root.style.height = h;
      else root.style.removeProperty('height');
    });

    adoptElement<HTMLDivElement>('div', (viewport) => {
      renderEffect(() => {
        viewport.className = mergeClasses('mkt-scroll-area__viewport', props.classNames?.viewport);
      });
      const children = props.children;
      if (children) {
        if (Array.isArray(children)) {
          for (const c of children) if (c.parentNode !== viewport) viewport.appendChild(c);
        } else if (children.parentNode !== viewport) {
          viewport.appendChild(children);
        }
      }

      const onScrollPositionChange = props.onScrollPositionChange;
      if (onScrollPositionChange) {
        viewport.addEventListener('scroll', () => {
          onScrollPositionChange({ x: viewport.scrollLeft, y: viewport.scrollTop });
        });
      }
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
