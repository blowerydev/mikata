import { mergeClasses } from '../../utils/class-merge';
import type { ScrollAreaProps } from './ScrollArea.types';
import './ScrollArea.css';

function resolveSize(v: string | number | undefined): string | undefined {
  if (v == null) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

export function ScrollArea(props: ScrollAreaProps): HTMLElement {
  const {
    type = 'hover',
    scrollbarSize = 10,
    direction = 'vertical',
    height,
    width,
    offsetScrollbars,
    classNames,
    children,
    onScrollPositionChange,
    class: className,
    ref,
  } = props;

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-scroll-area', className, classNames?.root);
  root.dataset.type = type;
  root.dataset.direction = direction;
  if (offsetScrollbars) root.dataset.offset = '';
  root.style.setProperty('--_scrollbar-size', `${scrollbarSize}px`);
  const w = resolveSize(width);
  const h = resolveSize(height);
  if (w) root.style.width = w;
  if (h) root.style.height = h;

  const viewport = document.createElement('div');
  viewport.className = mergeClasses('mkt-scroll-area__viewport', classNames?.viewport);
  if (children) {
    if (Array.isArray(children)) for (const c of children) viewport.appendChild(c);
    else viewport.appendChild(children);
  }

  if (onScrollPositionChange) {
    viewport.addEventListener('scroll', () => {
      onScrollPositionChange({ x: viewport.scrollLeft, y: viewport.scrollTop });
    });
  }

  root.appendChild(viewport);

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
