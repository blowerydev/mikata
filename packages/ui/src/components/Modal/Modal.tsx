import { createRef, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useFocusTrap } from '../../utils/use-focus-trap';
import { useScrollLock } from '../../utils/use-scroll-lock';
import { useUILabels } from '../../utils/use-i18n-optional';
import { useId } from '../../utils/use-id';
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
  const id = useId('modal');
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
      titleEl.textContent = title;
      header.appendChild(titleEl);
    }

    if (withCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.className = mergeClasses('mkt-modal__close', classNames?.close);
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', labels.close);
      closeBtn.innerHTML =
        '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">' +
        '<path d="M4 4L12 12M12 4L4 12"/></svg>';
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
  root.appendChild(overlay);
  document.body.appendChild(root);

  // Focus trap
  useFocusTrap(contentRef);

  // Scroll lock
  useScrollLock();

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
