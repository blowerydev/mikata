import { mergeClasses } from '../../utils/class-merge';
import type { SimpleGridProps } from './SimpleGrid.types';
import './SimpleGrid.css';

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

export function SimpleGrid(props: SimpleGridProps = {}): HTMLElement {
  const {
    cols = 1,
    spacing = 'md',
    verticalSpacing,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-simple-grid', className, classNames?.root);
  el.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  el.style.columnGap = resolveGap(spacing) ?? '0';
  el.style.rowGap = resolveGap(verticalSpacing ?? spacing) ?? '0';

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
