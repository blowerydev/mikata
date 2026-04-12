import { mergeClasses } from '../../utils/class-merge';
import type { AlertProps } from './Alert.types';
import './Alert.css';

export function Alert(props: AlertProps = {} as AlertProps): HTMLElement {
  const {
    variant = 'light',
    color = 'primary',
    title,
    icon,
    closable,
    onClose,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const el = document.createElement('div');
  el.className = mergeClasses('mkt-alert', classNames?.root, className);
  el.setAttribute('role', 'alert');
  el.dataset.variant = variant;
  el.dataset.color = color;

  // Icon
  if (icon) {
    const iconWrapper = document.createElement('div');
    iconWrapper.className = mergeClasses('mkt-alert__icon', classNames?.icon);
    iconWrapper.appendChild(icon());
    el.appendChild(iconWrapper);
  }

  // Content
  const content = document.createElement('div');
  content.className = mergeClasses('mkt-alert__content');

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className = mergeClasses('mkt-alert__title', classNames?.title);
    titleEl.textContent = title;
    content.appendChild(titleEl);
  }

  if (children != null) {
    const messageEl = document.createElement('div');
    messageEl.className = mergeClasses('mkt-alert__message', classNames?.message);
    if (typeof children === 'string') {
      messageEl.textContent = children;
    } else {
      messageEl.appendChild(children);
    }
    content.appendChild(messageEl);
  }

  el.appendChild(content);

  // Close button
  if (closable) {
    const closeBtn = document.createElement('button');
    closeBtn.className = mergeClasses('mkt-alert__close-button', classNames?.closeButton);
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&#215;';
    closeBtn.addEventListener('click', () => {
      onClose?.();
    });
    el.appendChild(closeBtn);
  }

  if (ref) {
    if (typeof ref === 'function') {
      ref(el);
    } else {
      (ref as any).current = el;
    }
  }

  return el;
}
