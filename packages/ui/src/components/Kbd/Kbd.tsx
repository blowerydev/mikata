import { renderEffect } from '@mikata/reactivity';
import { mergeClasses } from '../../utils/class-merge';
import type { KbdProps } from './Kbd.types';
import './Kbd.css';

export function Kbd(props: KbdProps = {}): HTMLElement {
  const el = document.createElement('kbd');
  renderEffect(() => {
    el.className = mergeClasses('mkt-kbd', props.class);
  });
  renderEffect(() => { el.dataset.size = props.size ?? 'sm'; });

  renderEffect(() => {
    const c = props.children;
    if (c == null) el.textContent = '';
    else if (typeof c === 'string') el.textContent = c;
    else el.replaceChildren(c);
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
