import { createIcon, Close } from '@mikata/icons';
import { createRef, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { onFocusTrap } from '../../utils/on-focus-trap';
import { onScrollLock } from '../../utils/on-scroll-lock';
import { useUILabels } from '../../utils/use-i18n-optional';
import { uniqueId } from '../../utils/unique-id';
import { applyThemeToPortal } from '../../utils/get-color-scheme';
import type { ModalProps } from './Modal.types';
import './Modal.css';

export function Modal(props: ModalProps): Comment {
  const {
    title,
    size = 'md',
    centered,
    closeOnClickOutside = true,
    closeOnEscape = true,
    onClose,
    withCloseButton = true,
    classNames,
    children,
    class: className,
    ref,
  } = props;

  const contentRef = createRef<HTMLElement>();
  const id = uniqueId('modal');
  const labels = useUILabels();

  // Overlay (backdrop)
  const overlay = document.createElement('div');
  overlay.className = mergeClasses('mkt-modal__overlay', classNames?.overlay);
  if (closeOnClickOutside) {
    overlay.addEventListener('click', onClose);
  }

  // Content wrapper
  const content = document.createElement('div');
  content.className = mergeClasses('mkt-modal__content', classNames?.content);
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-modal', 'true');
  content.setAttribute('data-size', size);
  if (title) content.setAttribute('aria-labelledby', `${id}-title`);
  if (centered) content.setAttribute('data-centered', '');
  content.addEventListener('click', (e) => e.stopPropagation());
  contentRef(content);

  // Header
  if (title || withCloseButton) {
    const header = document.createElement('div');
    header.className = mergeClasses('mkt-modal__header', classNames?.header);

    if (title) {
      const titleEl = document.createElement('h2');
      titleEl.className = mergeClasses('mkt-modal__title', classNames?.title);
      titleEl.id = `${id}-title`;
      if (title instanceof Node) { titleEl.appendChild(title); } else { titleEl.textContent = title; }
      header.appendChild(titleEl);
    }

    if (withCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.className = mergeClasses('mkt-modal__close', classNames?.close);
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', labels.close);
      closeBtn.appendChild(createIcon(Close, { strokeWidth: 1.5 }));
      closeBtn.addEventListener('click', onClose);
      header.appendChild(closeBtn);
    }

    content.appendChild(header);
  }

  // Body
  const body = document.createElement('div');
  body.className = mergeClasses('mkt-modal__body', classNames?.body);
  body.appendChild(children);
  content.appendChild(body);

  // Assemble: content inside overlay inside root
  overlay.appendChild(content);

  const root = document.createElement('div');
  root.className = mergeClasses('mkt-modal', className, classNames?.root);
  applyThemeToPortal(root);
  root.appendChild(overlay);
  document.body.appendChild(root);

  // Focus trap
  onFocusTrap(contentRef);

  // Scroll lock
  onScrollLock();

  // Escape key
  if (closeOnEscape) {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    onCleanup(() => document.removeEventListener('keydown', handler));
  }

  // Cleanup: remove from body
  onCleanup(() => {
    root.remove();
  });

  // Ref
  if (ref) {
    if (typeof ref === 'function') ref(content);
    else (ref as any).current = content;
  }

  // Return a comment placeholder since the actual modal is appended to body
  return document.createComment('mkt-modal');
}
