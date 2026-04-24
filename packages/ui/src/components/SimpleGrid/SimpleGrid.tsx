import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
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
  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-simple-grid', props.class, props.classNames?.root);
    });
    renderEffect(() => {
      el.style.gridTemplateColumns = `repeat(${props.cols ?? 1}, minmax(0, 1fr))`;
    });
    renderEffect(() => {
      el.style.columnGap = resolveGap(props.spacing ?? 'md') ?? '0';
    });
    renderEffect(() => {
      el.style.rowGap = resolveGap(props.verticalSpacing ?? props.spacing ?? 'md') ?? '0';
    });

    const children = props.children;
    if (children) {
      if (Array.isArray(children)) {
        for (const c of children) if (c.parentNode !== el) el.appendChild(c);
      } else if (children.parentNode !== el) {
        el.appendChild(children);
      }
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
