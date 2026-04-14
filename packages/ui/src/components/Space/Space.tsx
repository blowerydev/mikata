import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { SpaceProps } from './Space.types';
import './Space.css';

export function Space(props: SpaceProps = {}): HTMLElement {
  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-space', props.class);
  });
  renderEffect(() => { el.dataset.size = props.size ?? 'md'; });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
