import { getCurrentScope, onCleanup, renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement, createRef } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { onClickOutside } from '../../utils/on-click-outside';
import type { PopoverProps } from './Popover.types';
import './Popover.css';

export function Popover(userProps: PopoverProps): HTMLSpanElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as PopoverProps;

  const target = props.target;
  const children = props.children;
  const withArrow = props.withArrow;
  const closeOnClickOutside = props.closeOnClickOutside ?? true;
  const closeOnEscape = props.closeOnEscape ?? true;
  const onClose = props.onClose;

  return adoptElement<HTMLSpanElement>('span', (wrapper) => {
    renderEffect(() => {
      wrapper.className = mergeClasses('mkt-popover', props.class, props.classNames?.root);
    });
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    if (target.parentNode !== wrapper) wrapper.appendChild(target);

    adoptElement<HTMLDivElement>('div', (dropdown) => {
      renderEffect(() => {
        dropdown.className = mergeClasses('mkt-popover__dropdown', props.classNames?.dropdown);
      });
      renderEffect(() => { dropdown.dataset.position = props.position ?? 'bottom'; });
      dropdown.setAttribute('role', 'dialog');

      if (withArrow) {
        adoptElement<HTMLDivElement>('div', (arrow) => {
          renderEffect(() => {
            arrow.className = mergeClasses('mkt-popover__arrow', props.classNames?.arrow);
          });
        });
      }

      if (children.parentNode !== dropdown) dropdown.appendChild(children);
    });

    if (closeOnClickOutside && onClose) {
      const wrapperRef = createRef<HTMLElement>();
      wrapperRef(wrapper);
      onClickOutside(wrapperRef, onClose);
    }

    if (closeOnEscape && onClose) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handler);
      if (getCurrentScope()) {
        onCleanup(() => document.removeEventListener('keydown', handler));
      }
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(wrapper);
      else (ref as { current: HTMLSpanElement | null }).current = wrapper;
    }
  });
}
