import { createIcon, Close } from '../../internal/icons';
import { mergeClasses } from '../../utils/class-merge';
import { applyThemeToPortal } from '../../utils/get-color-scheme';
import type { ToastOptions, ToastInstance, ToastManager, ToastPosition } from './Toast.types';
import './Toast.css';

let toastCounter = 0;

const containers = new Map<ToastPosition, HTMLElement>();
const activeToasts = new Map<string, { el: HTMLElement; timer: ReturnType<typeof setTimeout> | null; position: ToastPosition }>();

function getContainer(position: ToastPosition): HTMLElement {
  let container = containers.get(position);
  if (container && container.isConnected) {
    // Update theme each time in case color scheme changed
    applyThemeToPortal(container);
    return container;
  }

  container = document.createElement('div');
  container.className = mergeClasses('mkt-toast-container');
  container.dataset.position = position;
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-relevant', 'additions');
  applyThemeToPortal(container);
  document.body.appendChild(container);
  containers.set(position, container);
  return container;
}

function createToastEl(id: string, options: ToastOptions): HTMLElement {
  const {
    title,
    message,
    color = 'primary',
    closable = true,
    icon,
  } = options;

  const el = document.createElement('div');
  el.className = 'mkt-toast';
  el.dataset.color = color;
  el.setAttribute('role', 'status');
  el.id = id;

  if (icon) {
    const iconWrap = document.createElement('div');
    iconWrap.className = 'mkt-toast__icon';
    iconWrap.appendChild(icon());
    el.appendChild(iconWrap);
  }

  const content = document.createElement('div');
  content.className = 'mkt-toast__content';

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'mkt-toast__title';
    titleEl.textContent = title;
    content.appendChild(titleEl);
  }

  const messageEl = document.createElement('div');
  messageEl.className = 'mkt-toast__message';
  messageEl.textContent = message;
  content.appendChild(messageEl);

  el.appendChild(content);

  if (closable) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mkt-toast__close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.appendChild(createIcon(Close, { strokeWidth: 1.5 }));
    closeBtn.addEventListener('click', () => closeToast(id));
    el.appendChild(closeBtn);
  }

  return el;
}

function closeToast(id: string) {
  const entry = activeToasts.get(id);
  if (!entry) return;

  if (entry.timer) clearTimeout(entry.timer);
  entry.el.classList.add('mkt-toast--exiting');

  setTimeout(() => {
    entry.el.remove();
    activeToasts.delete(id);

    // Remove container if empty
    const container = containers.get(entry.position);
    if (container && container.children.length === 0) {
      container.remove();
      containers.delete(entry.position);
    }
  }, 200);
}

function showToast(options: ToastOptions): ToastInstance {
  const id = `mkt-toast-${++toastCounter}`;
  const position = options.position ?? 'top-right';
  const duration = options.duration ?? 5000;

  const container = getContainer(position);
  const el = createToastEl(id, options);

  // Insert at top for top positions, bottom for bottom positions
  if (position.startsWith('top')) {
    container.appendChild(el);
  } else {
    container.insertBefore(el, container.firstChild);
  }

  // Trigger enter animation
  requestAnimationFrame(() => {
    el.classList.add('mkt-toast--entering');
  });

  let timer: ReturnType<typeof setTimeout> | null = null;
  if (duration > 0) {
    timer = setTimeout(() => closeToast(id), duration);
  }

  activeToasts.set(id, { el, timer, position });

  return {
    id,
    close: () => closeToast(id),
  };
}

export const toast: ToastManager = {
  show: showToast,

  success(message, options = {}) {
    return showToast({ ...options, message, color: 'green' });
  },

  error(message, options = {}) {
    return showToast({ ...options, message, color: 'red' });
  },

  warning(message, options = {}) {
    return showToast({ ...options, message, color: 'yellow' });
  },

  info(message, options = {}) {
    return showToast({ ...options, message, color: 'blue' });
  },

  closeAll() {
    for (const id of activeToasts.keys()) {
      closeToast(id);
    }
  },
};
