import { mergeClasses } from '../../utils/class-merge';
import type { FlexProps } from './Flex.types';
import './Flex.css';

const sizeMap: Record<string, string> = {
  xs: 'var(--mkt-space-1)',
  sm: 'var(--mkt-space-2)',
  md: 'var(--mkt-space-4)',
  lg: 'var(--mkt-space-6)',
  xl: 'var(--mkt-space-8)',
};

function resolveGap(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  return sizeMap[value] ?? value;
}

export function Flex(props: FlexProps = {}): HTMLElement {
  const {
    direction,
    wrap,
    align,
    justify,
    gap,
    rowGap,
    columnGap,
    inline,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-flex', className, classNames?.root);
  if (inline) el.dataset.inline = '';
  if (direction) el.style.flexDirection = direction;
  if (wrap) el.style.flexWrap = wrap;
  if (align) el.style.alignItems = align;
  if (justify) el.style.justifyContent = justify;
  const g = resolveGap(gap);
  const rg = resolveGap(rowGap);
  const cg = resolveGap(columnGap);
  if (g) el.style.gap = g;
  if (rg) el.style.rowGap = rg;
  if (cg) el.style.columnGap = cg;

  if (children) {
    if (Array.isArray(children)) {
      for (const c of children) el.appendChild(c);
    } else {
      el.appendChild(children);
    }
  }

  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as any).current = el;
  }

  return el;
}
