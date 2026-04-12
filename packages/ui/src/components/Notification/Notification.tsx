import { mergeClasses } from '../../utils/class-merge';
import { useUILabels } from '../../utils/use-i18n-optional';
import { Loader } from '../Loader';
import type { NotificationProps } from './Notification.types';
import './Notification.css';

export function Notification(props: NotificationProps = {}): HTMLElement {
  const {
    title,
    color = 'primary',
    icon,
    loading,
    withCloseButton = true,
    withBorder,
    onClose,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const labels = useUILabels();

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-notification', className, classNames?.root);
  root.dataset.color = color;
  root.setAttribute('role', 'status');
  if (withBorder) root.dataset.bordered = '';

  // Icon / loader
  if (loading) {
    const wrap = document.createElement('span');
    wrap.className = mergeClasses('mkt-notification__loader', classNames?.loader);
    wrap.appendChild(Loader({ size: 'sm', color }));
    root.appendChild(wrap);
  } else if (icon) {
    const wrap = document.createElement('span');
    wrap.className = mergeClasses('mkt-notification__icon', classNames?.icon);
    wrap.appendChild(icon);
    root.appendChild(wrap);
  }

  const body = document.createElement('div');
  body.className = 'mkt-notification__body';

  if (title != null) {
    const t = document.createElement('div');
    t.className = mergeClasses('mkt-notification__title', classNames?.title);
    if (title instanceof Node) t.appendChild(title);
    else t.textContent = title;
    body.appendChild(t);
  }

  if (children != null) {
    const desc = document.createElement('div');
    desc.className = mergeClasses('mkt-notification__description', classNames?.description);
    if (typeof children === 'string') desc.textContent = children;
    else desc.appendChild(children);
    body.appendChild(desc);
  }

  root.appendChild(body);

  if (withCloseButton && onClose) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = mergeClasses('mkt-notification__close', classNames?.close);
    close.setAttribute('aria-label', labels.close);
    close.innerHTML =
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M4 4L12 12M12 4L4 12"/></svg>';
    close.addEventListener('click', onClose);
    root.appendChild(close);
  }

  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as any).current = root;
  }

  return root;
}
