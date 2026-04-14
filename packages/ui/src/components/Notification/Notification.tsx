import { createIcon, Close } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { useUILabels } from '../../utils/use-i18n-optional';
import { Loader } from '../Loader';
import type { NotificationProps } from './Notification.types';
import './Notification.css';

export function Notification(userProps: NotificationProps = {}): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<NotificationProps>('Notification') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as NotificationProps;

  // `loading`, `icon`, `title`, `children`, `withCloseButton`, `onClose` are
  // structural — they decide which sub-elements exist.
  const loading = props.loading;
  const icon = props.icon;
  const title = props.title;
  const children = props.children;
  const withCloseButton = props.withCloseButton ?? true;
  const onClose = props.onClose;

  const labels = useUILabels();

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-notification', props.class, props.classNames?.root);
  });
  renderEffect(() => { root.dataset.color = props.color ?? 'primary'; });
  root.setAttribute('role', 'status');
  renderEffect(() => {
    if (props.withBorder) root.dataset.bordered = '';
    else delete root.dataset.bordered;
  });

  if (loading) {
    const wrap = document.createElement('span');
    renderEffect(() => {
      wrap.className = mergeClasses('mkt-notification__loader', props.classNames?.loader);
    });
    wrap.appendChild(Loader({ size: 'sm', color: props.color ?? 'primary' }));
    root.appendChild(wrap);
  } else if (icon) {
    const wrap = document.createElement('span');
    renderEffect(() => {
      wrap.className = mergeClasses('mkt-notification__icon', props.classNames?.icon);
    });
    wrap.appendChild(icon);
    root.appendChild(wrap);
  }

  const body = document.createElement('div');
  body.className = 'mkt-notification__body';

  if (title != null) {
    const t = document.createElement('div');
    renderEffect(() => {
      t.className = mergeClasses('mkt-notification__title', props.classNames?.title);
    });
    renderEffect(() => {
      const next = props.title;
      if (next == null) t.replaceChildren();
      else if (next instanceof Node) t.replaceChildren(next);
      else t.textContent = next;
    });
    body.appendChild(t);
  }

  if (children != null) {
    const desc = document.createElement('div');
    renderEffect(() => {
      desc.className = mergeClasses('mkt-notification__description', props.classNames?.description);
    });
    if (typeof children === 'string') {
      renderEffect(() => {
        const c = props.children;
        desc.textContent = typeof c === 'string' ? c : '';
      });
    } else {
      desc.appendChild(children as Node);
    }
    body.appendChild(desc);
  }

  root.appendChild(body);

  if (withCloseButton && onClose) {
    const close = document.createElement('button');
    close.type = 'button';
    renderEffect(() => {
      close.className = mergeClasses('mkt-notification__close', props.classNames?.close);
    });
    close.setAttribute('aria-label', labels.close);
    close.appendChild(createIcon(Close, { strokeWidth: 1.5 }));
    close.addEventListener('click', onClose);
    root.appendChild(close);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(root);
    else (ref as { current: HTMLElement | null }).current = root;
  }

  return root;
}
