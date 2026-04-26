import { getCurrentScope, onCleanup, renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { HoverCardProps } from './HoverCard.types';
import './HoverCard.css';

export function HoverCard(userProps: HoverCardProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as HoverCardProps;

  const target = props.target;
  const children = props.children;
  const withArrow = props.withArrow;
  const openDelay = props.openDelay ?? 150;
  const closeDelay = props.closeDelay ?? 150;

  return adoptElement<HTMLElement>('span', (wrapper) => {
    renderEffect(() => {
      wrapper.className = mergeClasses('mkt-hover-card', props.class, props.classNames?.root);
    });

    if (target.parentNode !== wrapper) wrapper.appendChild(target);

    // The dropdown is NOT in the SSR tree (it only appears on hover
    // after mount). Built fresh imperatively since it's purely a
    // post-hydration affordance. Reuses across show/hide cycles.
    const dropdown = document.createElement('div');
    dropdown.className = mergeClasses('mkt-hover-card__dropdown', props.classNames?.dropdown);
    dropdown.dataset.position = props.position ?? 'bottom';
    dropdown.setAttribute('role', 'dialog');
    if (withArrow) {
      const arrow = document.createElement('div');
      arrow.className = mergeClasses('mkt-hover-card__arrow', props.classNames?.arrow);
      dropdown.appendChild(arrow);
    }
    dropdown.appendChild(children);

    let openT: ReturnType<typeof setTimeout> | undefined;
    let closeT: ReturnType<typeof setTimeout> | undefined;
    let visible = false;

    const show = () => {
      clearTimeout(closeT);
      if (visible) return;
      openT = setTimeout(() => {
        wrapper.appendChild(dropdown);
        visible = true;
      }, openDelay);
    };

    const hide = () => {
      clearTimeout(openT);
      if (!visible) return;
      closeT = setTimeout(() => {
        dropdown.remove();
        visible = false;
      }, closeDelay);
    };

    wrapper.addEventListener('mouseenter', show);
    wrapper.addEventListener('mouseleave', hide);
    wrapper.addEventListener('focusin', show);
    wrapper.addEventListener('focusout', hide);

    if (getCurrentScope()) {
      onCleanup(() => {
        clearTimeout(openT);
        clearTimeout(closeT);
        dropdown.remove();
        wrapper.removeEventListener('mouseenter', show);
        wrapper.removeEventListener('mouseleave', hide);
        wrapper.removeEventListener('focusin', show);
        wrapper.removeEventListener('focusout', hide);
      });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(wrapper);
      else (ref as { current: HTMLElement | null }).current = wrapper;
    }
  });
}
