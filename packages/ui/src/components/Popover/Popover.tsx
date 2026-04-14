import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, createRef, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { onClickOutside } from '../../utils/on-click-outside';
import type { PopoverProps } from './Popover.types';
import './Popover.css';

export function Popover(userProps: PopoverProps): HTMLSpanElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as PopoverProps;

  // `target`, `children`, `withArrow`, `closeOnClickOutside`, `closeOnEscape`,
  // `onClose` are structural — they decide DOM shape and listener wiring.
  const target = props.target;
  const children = props.children;
  const withArrow = props.withArrow;
  const closeOnClickOutside = props.closeOnClickOutside ?? true;
  const closeOnEscape = props.closeOnEscape ?? true;
  const onClose = props.onClose;

  const wrapper = document.createElement('span');
  renderEffect(() => {
    wrapper.className = mergeClasses('mkt-popover', props.class, props.classNames?.root);
  });
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';

  wrapper.appendChild(target);

  const dropdown = document.createElement('div');
  renderEffect(() => {
    dropdown.className = mergeClasses('mkt-popover__dropdown', props.classNames?.dropdown);
  });
  renderEffect(() => { dropdown.dataset.position = props.position ?? 'bottom'; });
  dropdown.setAttribute('role', 'dialog');

  if (withArrow) {
    const arrow = document.createElement('div');
    renderEffect(() => {
      arrow.className = mergeClasses('mkt-popover__arrow', props.classNames?.arrow);
    });
    dropdown.appendChild(arrow);
  }

  dropdown.appendChild(children);
  wrapper.appendChild(dropdown);

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
    onCleanup(() => document.removeEventListener('keydown', handler));
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(wrapper);
    else (ref as { current: HTMLSpanElement | null }).current = wrapper;
  }

  return wrapper;
}
