import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { PaperProps } from './Paper.types';
import './Paper.css';

export function Paper(props: PaperProps = {}): HTMLElement {
  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses(
      'mkt-paper',
      props.withBorder && 'mkt-paper--bordered',
      props.class,
      props.classNames?.root,
    );
  });
  renderEffect(() => {
    if (props.shadow) el.dataset.shadow = props.shadow;
    else delete el.dataset.shadow;
  });
  renderEffect(() => { el.dataset.radius = props.radius ?? 'sm'; });
  renderEffect(() => { el.dataset.padding = props.padding ?? 'md'; });

  const children = props.children;
  if (children) {
    if (Array.isArray(children)) for (const c of children) el.appendChild(c);
    else el.appendChild(children);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
