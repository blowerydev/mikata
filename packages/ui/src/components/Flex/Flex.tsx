import { renderEffect } from '@mikata/reactivity';
import { adoptElement } from '@mikata/runtime';
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
  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-flex', props.class, props.classNames?.root);
    });
    renderEffect(() => {
      if (props.inline) el.dataset.inline = '';
      else delete el.dataset.inline;
    });
    renderEffect(() => { el.style.flexDirection = props.direction ?? ''; });
    renderEffect(() => { el.style.flexWrap = props.wrap ?? ''; });
    renderEffect(() => { el.style.alignItems = props.align ?? ''; });
    renderEffect(() => { el.style.justifyContent = props.justify ?? ''; });
    renderEffect(() => { el.style.gap = resolveGap(props.gap) ?? ''; });
    renderEffect(() => { el.style.rowGap = resolveGap(props.rowGap) ?? ''; });
    renderEffect(() => { el.style.columnGap = resolveGap(props.columnGap) ?? ''; });

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
