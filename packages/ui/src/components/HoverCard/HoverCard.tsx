import { onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import type { HoverCardProps } from './HoverCard.types';
import './HoverCard.css';

export function HoverCard(props: HoverCardProps): HTMLElement {
  const {
    position = 'bottom',
    openDelay = 150,
    closeDelay = 150,
    withArrow,
    target,
    children,
    classNames,
    class: className,
    ref,
  } = props;

  const wrapper = document.createElement('span');
  wrapper.className = mergeClasses('mkt-hover-card', className, classNames?.root);

  wrapper.appendChild(target);

  const dropdown = document.createElement('div');
  dropdown.className = mergeClasses('mkt-hover-card__dropdown', classNames?.dropdown);
  dropdown.dataset.position = position;
  dropdown.setAttribute('role', 'dialog');
  if (withArrow) {
    const arrow = document.createElement('div');
    arrow.className = mergeClasses('mkt-hover-card__arrow', classNames?.arrow);
    dropdown.appendChild(arrow);
  }
  dropdown.appendChild(children);

  let openT: any;
  let closeT: any;
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

  if (ref) {
    if (typeof ref === 'function') ref(wrapper);
    else (ref as any).current = wrapper;
  }

  return wrapper;
}
