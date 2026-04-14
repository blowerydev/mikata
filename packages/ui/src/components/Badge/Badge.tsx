import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { BadgeProps } from './Badge.types';
import './Badge.css';

export function Badge(userProps: BadgeProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<BadgeProps>('Badge') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as BadgeProps;

  const el = document.createElement('span');
  renderEffect(() => {
    el.className = mergeClasses('mkt-badge', props.class);
  });
  renderEffect(() => { el.dataset.variant = props.variant ?? 'filled'; });
  renderEffect(() => { el.dataset.size = props.size ?? 'md'; });
  renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });

  // Dot indicator — shown only when variant is 'dot'.
  const dot = document.createElement('span');
  dot.className = 'mkt-badge__dot';
  renderEffect(() => {
    const on = props.variant === 'dot';
    if (on && !dot.isConnected) el.insertBefore(dot, el.firstChild);
    else if (!on && dot.isConnected) dot.remove();
  });

  // Children: text or node. Put after the dot so DOM order stays stable.
  const slot = document.createTextNode('');
  el.appendChild(slot);
  renderEffect(() => {
    const c = props.children;
    if (c == null) {
      slot.nodeValue = '';
      return;
    }
    if (typeof c === 'string') {
      // Replace whatever follows the dot with a single text node.
      while (slot.nextSibling) slot.nextSibling.remove();
      slot.nodeValue = c;
    } else {
      slot.nodeValue = '';
      while (slot.nextSibling) slot.nextSibling.remove();
      el.appendChild(c);
    }
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
