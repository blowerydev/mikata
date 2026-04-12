import { createRef, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useClickOutside } from '../../utils/use-click-outside';
import type { PopoverProps } from './Popover.types';
import './Popover.css';

export function Popover(props: PopoverProps): HTMLSpanElement {
  const {
    position = 'bottom',
    onClose,
    withArrow,
    closeOnClickOutside = true,
    closeOnEscape = true,
    classNames,
    target,
    children,
    class: className,
    ref,
  } = props;

  const wrapper = document.createElement('span');
  wrapper.className = mergeClasses('mkt-popover', className, classNames?.root);
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';

  // Append the trigger target
  wrapper.appendChild(target);

  // Create dropdown
  const dropdown = document.createElement('div');
  dropdown.className = mergeClasses('mkt-popover__dropdown', classNames?.dropdown);
  dropdown.setAttribute('data-position', position);
  dropdown.setAttribute('role', 'dialog');

  // Arrow
  if (withArrow) {
    const arrow = document.createElement('div');
    arrow.className = mergeClasses('mkt-popover__arrow', classNames?.arrow);
    dropdown.appendChild(arrow);
  }

  dropdown.appendChild(children);
  wrapper.appendChild(dropdown);

  // Click outside
  if (closeOnClickOutside && onClose) {
    const wrapperRef = createRef<HTMLElement>();
    wrapperRef(wrapper);
    useClickOutside(wrapperRef, onClose);
  }

  // Escape key
  if (closeOnEscape && onClose) {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    onCleanup(() => document.removeEventListener('keydown', handler));
  }

  if (ref) {
    if (typeof ref === 'function') ref(wrapper);
    else (ref as any).current = wrapper;
  }

  return wrapper;
}
