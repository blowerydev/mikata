import { createIcon, Close } from '../../internal/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
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

  const loading = props.loading;
  const icon = props.icon;
  const title = props.title;
  const children = props.children;
  const withCloseButton = props.withCloseButton ?? true;
  const onClose = props.onClose;

  const labels = useUILabels();

  return adoptElement<HTMLElement>('div', (root) => {
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
      adoptElement<HTMLSpanElement>('span', (wrap) => {
        renderEffect(() => {
          wrap.className = mergeClasses('mkt-notification__loader', props.classNames?.loader);
        });
        if (!wrap.firstChild) {
          wrap.appendChild(Loader({ size: 'sm', color: props.color ?? 'primary' }));
        }
      });
    } else if (icon) {
      adoptElement<HTMLSpanElement>('span', (wrap) => {
        renderEffect(() => {
          wrap.className = mergeClasses('mkt-notification__icon', props.classNames?.icon);
        });
        if (!wrap.firstChild) wrap.appendChild(icon);
      });
    }

    adoptElement<HTMLDivElement>('div', (body) => {
      body.className = 'mkt-notification__body';

      if (title != null) {
        adoptElement<HTMLDivElement>('div', (t) => {
          renderEffect(() => {
            t.className = mergeClasses('mkt-notification__title', props.classNames?.title);
          });
          renderEffect(() => {
            const next = props.title;
            if (next == null) t.replaceChildren();
            else if (next instanceof Node) t.replaceChildren(next);
            else t.textContent = next;
          });
        });
      }

      if (children != null) {
        adoptElement<HTMLDivElement>('div', (desc) => {
          renderEffect(() => {
            desc.className = mergeClasses('mkt-notification__description', props.classNames?.description);
          });
          if (typeof children === 'string') {
            renderEffect(() => {
              const c = props.children;
              desc.textContent = typeof c === 'string' ? c : '';
            });
          } else if ((children as Node).parentNode !== desc) {
            desc.appendChild(children as Node);
          }
        });
      }
    });

    if (withCloseButton && onClose) {
      adoptElement<HTMLButtonElement>('button', (close) => {
        close.setAttribute('type', 'button');
        renderEffect(() => {
          close.className = mergeClasses('mkt-notification__close', props.classNames?.close);
        });
        close.setAttribute('aria-label', labels.close);
        if (!close.firstChild) close.appendChild(createIcon(Close, { strokeWidth: 1.5 }));
        close.addEventListener('click', onClose);
      });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(root);
      else (ref as { current: HTMLElement | null }).current = root;
    }
  });
}
