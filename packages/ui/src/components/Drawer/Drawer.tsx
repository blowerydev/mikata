import { createRef, onCleanup } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useFocusTrap } from '../../utils/use-focus-trap';
import { useScrollLock } from '../../utils/use-scroll-lock';
import { useUILabels } from '../../utils/use-i18n-optional';
import { useId } from '../../utils/use-id';
import type { DrawerProps } from './Drawer.types';
import './Drawer.css';

export function Drawer(props: DrawerProps): Comment {
  const {
    title,
    position = 'right',
    size = '320px',
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
  const id = useId('drawer');
  const labels = useUILabels();

  // Overlay (backdrop)
  const overlay = document.createElement('div');
  overlay.className = mergeClasses('mkt-drawer__overlay', classNames?.overlay);
  if (closeOnClickOutside) {
    overlay.addEventListener('click', onClose);
  }

  // Content panel
  const content = document.createElement('div');
  content.className = mergeClasses('mkt-drawer__content', classNames?.content);
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-modal', 'true');
  content.setAttribute('data-position', position);
  if (title) content.setAttribute('aria-labelledby', `${id}-title`);

  // Set size based on position
  const isHorizontal = position === 'left' || position === 'right';
  if (isHorizontal) {
    content.style.width = size;
  } else {
    content.style.height = size;
  }

  contentRef(content);

  // Header
  if (title || withCloseButton) {
    const header = document.createElement('div');
    header.className = mergeClasses('mkt-drawer__header', classNames?.header);

    if (title) {
      const titleEl = document.createElement('h2');
      titleEl.className = mergeClasses('mkt-drawer__title', classNames?.title);
      titleEl.id = `${id}-title`;
      titleEl.textContent = title;
      header.appendChild(titleEl);
    }

    if (withCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.className = mergeClasses('mkt-drawer__close', classNames?.close);
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
  body.className = mergeClasses('mkt-drawer__body', classNames?.body);
  body.appendChild(children);
  content.appendChild(body);

  // Assemble into root container
  const root = document.createElement('div');
  root.className = mergeClasses('mkt-drawer', className, classNames?.root);
  root.appendChild(overlay);
  root.appendChild(content);
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

  // Return a comment placeholder since the actual drawer is appended to body
  return document.createComment('mkt-drawer');
}
