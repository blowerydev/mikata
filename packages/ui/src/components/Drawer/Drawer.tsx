import { createIcon, Close } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, createRef, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { onFocusTrap } from '../../utils/on-focus-trap';
import { onScrollLock } from '../../utils/on-scroll-lock';
import { useUILabels } from '../../utils/use-i18n-optional';
import { uniqueId } from '../../utils/unique-id';
import { applyThemeToPortal } from '../../utils/get-color-scheme';
import type { DrawerProps } from './Drawer.types';
import './Drawer.css';

export function Drawer(userProps: DrawerProps): Comment {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as DrawerProps;

  // `title`, `children`, `position`, `size`, `withCloseButton`,
  // `closeOnClickOutside`, `closeOnEscape` are structural — they decide which
  // DOM nodes and listeners exist, and position/size style is only set once.
  const title = props.title;
  const children = props.children;
  const position = props.position ?? 'right';
  const size = props.size ?? '320px';
  const withCloseButton = props.withCloseButton ?? true;
  const closeOnClickOutside = props.closeOnClickOutside ?? true;
  const closeOnEscape = props.closeOnEscape ?? true;
  const onClose = props.onClose;

  const contentRef = createRef<HTMLElement>();
  const id = uniqueId('drawer');
  const labels = useUILabels();

  // Portaled component — same pattern as Modal. The visible overlay +
  // panel live under document.body, and the component returns a
  // Comment for its logical slot. Hydration doesn't need `adoptElement`
  // because nothing in the portal subtree is in the SSR tree to adopt.
  const overlay = document.createElement('div');
  renderEffect(() => {
    overlay.className = mergeClasses('mkt-drawer__overlay', props.classNames?.overlay);
  });
  if (closeOnClickOutside) {
    overlay.addEventListener('click', onClose);
  }

  const content = document.createElement('div');
  renderEffect(() => {
    content.className = mergeClasses('mkt-drawer__content', props.classNames?.content);
  });
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-modal', 'true');
  content.dataset.position = position;
  if (title) content.setAttribute('aria-labelledby', `${id}-title`);

  const isHorizontal = position === 'left' || position === 'right' || position === 'start' || position === 'end';
  if (isHorizontal) content.style.width = size;
  else content.style.height = size;

  contentRef(content);

  if (title || withCloseButton) {
    const header = document.createElement('div');
    renderEffect(() => {
      header.className = mergeClasses('mkt-drawer__header', props.classNames?.header);
    });

    if (title) {
      const titleEl = document.createElement('h2');
      renderEffect(() => {
        titleEl.className = mergeClasses('mkt-drawer__title', props.classNames?.title);
      });
      titleEl.id = `${id}-title`;
      renderEffect(() => {
        const t = props.title;
        if (t == null) titleEl.replaceChildren();
        else if (t instanceof Node) titleEl.replaceChildren(t);
        else titleEl.textContent = t;
      });
      header.appendChild(titleEl);
    }

    if (withCloseButton) {
      const closeBtn = document.createElement('button');
      renderEffect(() => {
        closeBtn.className = mergeClasses('mkt-drawer__close', props.classNames?.close);
      });
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', labels.close);
      closeBtn.appendChild(createIcon(Close, { strokeWidth: 1.5 }));
      closeBtn.addEventListener('click', onClose);
      header.appendChild(closeBtn);
    }

    content.appendChild(header);
  }

  const body = document.createElement('div');
  renderEffect(() => {
    body.className = mergeClasses('mkt-drawer__body', props.classNames?.body);
  });
  body.appendChild(children);
  content.appendChild(body);

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-drawer', props.class, props.classNames?.root);
  });
  applyThemeToPortal(root);
  root.appendChild(overlay);
  root.appendChild(content);
  document.body.appendChild(root);

  onFocusTrap(contentRef);
  onScrollLock();

  if (closeOnEscape) {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    onCleanup(() => document.removeEventListener('keydown', handler));
  }

  onCleanup(() => {
    root.remove();
  });

  const ref = props.ref;
  if (ref) {
    if (typeof ref === 'function') ref(content);
    else (ref as { current: HTMLElement | null }).current = content;
  }

  return document.createComment('mkt-drawer');
}
