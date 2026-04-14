import { createIcon, Close } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import type { AlertProps } from './Alert.types';
import './Alert.css';

export function Alert(userProps: AlertProps = {} as AlertProps): HTMLElement {
  const props = _mergeProps(
    useComponentDefaults<AlertProps>('Alert') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as AlertProps;

  // `icon`, presence of `title`/`children`, and `closable` are structural —
  // they decide which sub-elements exist. The *contents* of title/children are
  // read lazily so locale-reactive strings update in place.
  const icon = props.icon;
  const hasTitle = props.title != null;
  const initialChildren = props.children;
  const hasChildren = initialChildren != null;
  const closable = props.closable;

  const el = document.createElement('div');
  renderEffect(() => {
    el.className = mergeClasses('mkt-alert', props.classNames?.root, props.class);
  });
  el.setAttribute('role', 'alert');
  renderEffect(() => { el.dataset.variant = props.variant ?? 'light'; });
  renderEffect(() => { el.dataset.color = props.color ?? 'primary'; });

  if (icon) {
    const iconWrapper = document.createElement('div');
    renderEffect(() => {
      iconWrapper.className = mergeClasses('mkt-alert__icon', props.classNames?.icon);
    });
    iconWrapper.appendChild(icon());
    el.appendChild(iconWrapper);
  }

  const content = document.createElement('div');
  content.className = 'mkt-alert__content';

  if (hasTitle) {
    const titleEl = document.createElement('div');
    renderEffect(() => {
      titleEl.className = mergeClasses('mkt-alert__title', props.classNames?.title);
    });
    renderEffect(() => {
      const t = props.title;
      if (t == null) titleEl.replaceChildren();
      else if (t instanceof Node) titleEl.replaceChildren(t);
      else titleEl.textContent = t;
    });
    content.appendChild(titleEl);
  }

  if (hasChildren) {
    const messageEl = document.createElement('div');
    renderEffect(() => {
      messageEl.className = mergeClasses('mkt-alert__message', props.classNames?.message);
    });
    // If the initial child is a Node (e.g. JSX element with its own reactive
    // bindings), mount it once — the compiler keeps it self-updating. For
    // plain strings, re-read lazily so translated labels track locale changes.
    if (typeof initialChildren === 'string') {
      renderEffect(() => {
        const c = props.children;
        messageEl.textContent = typeof c === 'string' ? c : '';
      });
    } else {
      messageEl.appendChild(initialChildren as Node);
    }
    content.appendChild(messageEl);
  }

  el.appendChild(content);

  if (closable) {
    const closeBtn = document.createElement('button');
    renderEffect(() => {
      closeBtn.className = mergeClasses('mkt-alert__close-button', props.classNames?.closeButton);
    });
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.appendChild(createIcon(Close, { strokeWidth: 1.5 }));
    closeBtn.addEventListener('click', () => {
      props.onClose?.();
    });
    el.appendChild(closeBtn);
  }

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(el);
    else (ref as { current: HTMLElement | null }).current = el;
  }

  return el;
}
