import { createIcon, Close } from '../../internal/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, adoptElement } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { AlertProps } from './Alert.types';
import './Alert.css';

export function Alert(userProps: AlertProps = {} as AlertProps): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<AlertProps>('Alert') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as AlertProps;

  // `icon`, presence of `title`/`children`, and `closable` are
  // structural - they decide which sub-elements exist. Content inside
  // those slots is read lazily so locale-reactive strings update.
  const icon = props.icon;
  const hasTitle = props.title != null;
  const initialChildren = props.children;
  const hasChildren = initialChildren != null;
  const closable = props.closable;

  return adoptElement<HTMLElement>('div', (el) => {
    renderEffect(() => {
      el.className = mergeClasses('mkt-alert', props.classNames?.root, props.class);
    });
    el.setAttribute('role', 'alert');
    renderEffect(() => { el.dataset.variant = props.variant ?? 'light'; });
    renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });

    if (icon) {
      adoptElement<HTMLDivElement>('div', (iconWrapper) => {
        renderEffect(() => {
          iconWrapper.className = mergeClasses('mkt-alert__icon', props.classNames?.icon);
        });
        if (!iconWrapper.firstChild) iconWrapper.appendChild(icon());
      });
    }

    adoptElement<HTMLDivElement>('div', (content) => {
      content.className = 'mkt-alert__content';

      if (hasTitle) {
        adoptElement<HTMLDivElement>('div', (titleEl) => {
          renderEffect(() => {
            titleEl.className = mergeClasses('mkt-alert__title', props.classNames?.title);
          });
          renderEffect(() => {
            const t = props.title;
            if (t == null) titleEl.replaceChildren();
            else if (t instanceof Node) titleEl.replaceChildren(t);
            else titleEl.textContent = t;
          });
        });
      }

      if (hasChildren) {
        adoptElement<HTMLDivElement>('div', (messageEl) => {
          renderEffect(() => {
            messageEl.className = mergeClasses('mkt-alert__message', props.classNames?.message);
          });
          if (typeof initialChildren === 'string') {
            renderEffect(() => {
              const c = props.children;
              messageEl.textContent = typeof c === 'string' ? c : '';
            });
          } else if ((initialChildren as Node).parentNode !== messageEl) {
            messageEl.appendChild(initialChildren as Node);
          }
        });
      }
    });

    if (closable) {
      adoptElement<HTMLButtonElement>('button', (closeBtn) => {
        renderEffect(() => {
          closeBtn.className = mergeClasses('mkt-alert__close-button', props.classNames?.closeButton);
        });
        closeBtn.setAttribute('type', 'button');
        closeBtn.setAttribute('aria-label', 'Close');
        if (!closeBtn.firstChild) {
          closeBtn.appendChild(createIcon(Close, { strokeWidth: 1.5 }));
        }
        closeBtn.addEventListener('click', () => {
          props.onClose?.();
        });
      });
    }

    const ref = props.ref;
    if (ref) {
      if (typeof ref === 'function') ref(el);
      else (ref as { current: HTMLElement | null }).current = el;
    }
  });
}
