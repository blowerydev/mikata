import { createIcon, Close } from '@mikata/icons';
import { renderEffect } from '@mikata/reactivity';
import { _mergeProps, createRef, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { onFocusTrap } from '../../utils/on-focus-trap';
import { onScrollLock } from '../../utils/on-scroll-lock';
import { useUILabels } from '../../utils/use-i18n-optional';
import { uniqueId } from '../../utils/unique-id';
import { applyThemeToPortal } from '../../utils/get-color-scheme';
import type { ModalProps } from './Modal.types';
import './Modal.css';

export function Modal(userProps: ModalProps): Comment {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as ModalProps;

  // `title`, `children`, `withCloseButton`, `closeOnClickOutside`,
  // `closeOnEscape` are structural — they decide which DOM nodes and
  // listeners exist.
  const title = props.title;
  const children = props.children;
  const withCloseButton = props.withCloseButton ?? true;
  const closeOnClickOutside = props.closeOnClickOutside ?? true;
  const closeOnEscape = props.closeOnEscape ?? true;
  const onClose = props.onClose;

  const contentRef = createRef<HTMLElement>();
  const id = uniqueId('modal');
  const labels = useUILabels();

  const overlay = document.createElement('div');
  renderEffect(() => {
    overlay.className = mergeClasses('mkt-modal__overlay', props.classNames?.overlay);
  });
  if (closeOnClickOutside) {
    overlay.addEventListener('click', onClose);
  }

  const content = document.createElement('div');
  renderEffect(() => {
    content.className = mergeClasses('mkt-modal__content', props.classNames?.content);
  });
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-modal', 'true');
  renderEffect(() => { content.dataset.size = props.size ?? 'md'; });
  if (title) content.setAttribute('aria-labelledby', `${id}-title`);
  renderEffect(() => {
    if (props.centered) content.dataset.centered = '';
    else delete content.dataset.centered;
  });
  content.addEventListener('click', (e) => e.stopPropagation());
  contentRef(content);

  if (title || withCloseButton) {
    const header = document.createElement('div');
    renderEffect(() => {
      header.className = mergeClasses('mkt-modal__header', props.classNames?.header);
    });

    if (title) {
      const titleEl = document.createElement('h2');
      renderEffect(() => {
        titleEl.className = mergeClasses('mkt-modal__title', props.classNames?.title);
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
        closeBtn.className = mergeClasses('mkt-modal__close', props.classNames?.close);
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
    body.className = mergeClasses('mkt-modal__body', props.classNames?.body);
  });
  body.appendChild(children);
  content.appendChild(body);

  overlay.appendChild(content);

  const root = document.createElement('div');
  renderEffect(() => {
    root.className = mergeClasses('mkt-modal', props.class, props.classNames?.root);
  });
  applyThemeToPortal(root);
  root.appendChild(overlay);
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

  return document.createComment('mkt-modal');
}
