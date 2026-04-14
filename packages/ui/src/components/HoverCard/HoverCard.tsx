import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { HoverCardProps } from './HoverCard.types';
import './HoverCard.css';

export function HoverCard(userProps: HoverCardProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as HoverCardProps;

  // `target`, `children`, `withArrow`, `openDelay`, `closeDelay` are
  // structural — decide DOM shape and timer configuration at setup.
  const target = props.target;
  const children = props.children;
  const withArrow = props.withArrow;
  const openDelay = props.openDelay ?? 150;
  const closeDelay = props.closeDelay ?? 150;

  const wrapper = document.createElement('span');
  renderEffect(() => {
    wrapper.className = mergeClasses('mkt-hover-card', props.class, props.classNames?.root);
  });

  wrapper.appendChild(target);

  const dropdown = document.createElement('div');
  renderEffect(() => {
    dropdown.className = mergeClasses('mkt-hover-card__dropdown', props.classNames?.dropdown);
  });
  renderEffect(() => { dropdown.dataset.position = props.position ?? 'bottom'; });
  dropdown.setAttribute('role', 'dialog');
  if (withArrow) {
    const arrow = document.createElement('div');
    renderEffect(() => {
      arrow.className = mergeClasses('mkt-hover-card__arrow', props.classNames?.arrow);
    });
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

  onCleanup(() => {
    clearTimeout(openT);
    clearTimeout(closeT);
    dropdown.remove();
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(wrapper);
    else (ref as { current: HTMLElement | null }).current = wrapper;
  }

  return wrapper;
}
