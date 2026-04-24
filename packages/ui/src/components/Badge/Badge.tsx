import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { BadgeProps } from './Badge.types';
import './Badge.css';

export function Badge(userProps: BadgeProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<BadgeProps>('Badge') as Record<string, unknown>,
    userProps as Record<string, unknown>,
  ) as BadgeProps;

  return adoptElement<HTMLElement>('span', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-badge', props.class);
    });
    renderEffect(() => { el.dataset.variant = props.variant ?? 'filled'; });
    renderEffect(() => { el.dataset.size = props.size ?? 'md'; });
    renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });

    // Dot + content slot are always in the tree so SSR/hydrate structure
    // stays stable. The dot hides when variant !== 'dot', and the text
    // slot's value tracks `props.children`.
    adoptElement<HTMLSpanElement>('span', (dot) => {
      dot.className = 'mkt-badge__dot';
      renderEffect(() => {
        dot.hidden = props.variant !== 'dot';
      });
    });

    // Content slot: prefer a dedicated span so swapping text/node
    // children doesn't disturb the dot's position.
    adoptElement<HTMLSpanElement>('span', (slot) => {
      slot.className = 'mkt-badge__content';
      renderEffect(() => {
        const c = props.children;
        slot.replaceChildren();
        if (c == null) return;
        if (typeof c === 'string') slot.textContent = c;
        else slot.appendChild(c);
      });
    });

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
