/**
 * Dev-mode error overlay — a fixed-position banner that surfaces uncaught
 * errors and unhandled promise rejections from inside the running app. Mirrors
 * the React/Vite DX so failures don't hide silently in the console.
 *
 * Installed automatically from `render()` in dev. Disable via
 * `render(factory, target, { errorOverlay: false })` or by setting
 * `window.__MIKATA_ERROR_OVERLAY__ = false` before `render` runs.
 */

declare const __DEV__: boolean;

interface ErrorEntry {
  title: string;
  message: string;
  stack: string;
  count: number;
}

let installed = false;
let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let listEl: HTMLElement | null = null;
let errorHandler: ((e: ErrorEvent) => void) | null = null;
let rejectionHandler: ((e: PromiseRejectionEvent) => void) | null = null;
const entries: ErrorEntry[] = [];

const OVERLAY_STYLES = `
  :host {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2147483647;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.5;
    color: #fff;
    pointer-events: none;
  }
  .overlay {
    max-height: 60vh;
    overflow-y: auto;
    background: #1a1a1a;
    border-bottom: 3px solid #e5484d;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    pointer-events: auto;
  }
  .entry {
    padding: 12px 16px;
    border-bottom: 1px solid #2a2a2a;
    position: relative;
  }
  .entry:last-child { border-bottom: none; }
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .title {
    color: #ff8c92;
    font-weight: 600;
    flex: 1;
    word-break: break-word;
  }
  .count {
    background: #e5484d;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 10px;
  }
  .dismiss {
    background: transparent;
    border: none;
    color: #999;
    font-size: 18px;
    line-height: 1;
    padding: 0 4px;
    cursor: pointer;
    border-radius: 3px;
  }
  .dismiss:hover { color: #fff; background: #2a2a2a; }
  .message {
    color: #fff;
    margin-bottom: 6px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .stack {
    color: #aaa;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    font-size: 12px;
  }
  .brand {
    font-size: 11px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-right: 4px;
  }
`;

function ensureHost(): void {
  if (host) return;
  host = document.createElement('mikata-error-overlay');
  // Open mode so test harnesses can peek in; the overlay is dev-only anyway.
  shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = OVERLAY_STYLES;
  listEl = document.createElement('div');
  listEl.className = 'overlay';
  shadow.appendChild(style);
  shadow.appendChild(listEl);
  document.body.appendChild(host);
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function render(): void {
  if (!listEl) return;
  if (entries.length === 0) {
    host?.remove();
    host = null;
    shadow = null;
    listEl = null;
    return;
  }
  listEl.innerHTML = '';
  entries.forEach((entry, i) => {
    const el = document.createElement('div');
    el.className = 'entry';
    el.innerHTML = [
      '<div class="header">',
      '<span class="brand">Mikata</span>',
      `<span class="title">${escape(entry.title)}</span>`,
      entry.count > 1 ? `<span class="count">×${entry.count}</span>` : '',
      '<button class="dismiss" aria-label="Dismiss">×</button>',
      '</div>',
      `<div class="message">${escape(entry.message)}</div>`,
      entry.stack ? `<pre class="stack">${escape(entry.stack)}</pre>` : '',
    ].join('');
    const btn = el.querySelector('.dismiss') as HTMLButtonElement;
    btn.addEventListener('click', () => {
      entries.splice(i, 1);
      render();
    });
    listEl!.appendChild(el);
  });
}

function report(title: string, err: unknown): void {
  let message: string;
  let stack = '';
  if (err instanceof Error) {
    message = err.message || String(err);
    stack = err.stack ?? '';
    // Browsers typically prefix the stack with the message; strip the duplicate.
    if (stack.startsWith(err.name + ': ' + err.message)) {
      stack = stack.slice((err.name + ': ' + err.message).length).replace(/^\n/, '');
    } else if (stack.startsWith(err.message)) {
      stack = stack.slice(err.message.length).replace(/^\n/, '');
    }
  } else {
    message = typeof err === 'string' ? err : String(err);
  }

  // Collapse identical repeated errors into a count badge.
  const last = entries[entries.length - 1];
  if (last && last.title === title && last.message === message && last.stack === stack) {
    last.count += 1;
    render();
    return;
  }

  entries.push({ title, message, stack, count: 1 });
  ensureHost();
  render();
}

/**
 * Install global error + unhandled-rejection listeners that surface the error
 * in a fixed-position overlay. Idempotent.
 */
export function installErrorOverlay(): void {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;

  errorHandler = (e: ErrorEvent) => {
    report('Uncaught error', e.error ?? e.message);
  };
  rejectionHandler = (e: PromiseRejectionEvent) => {
    report('Unhandled promise rejection', e.reason);
  };

  window.addEventListener('error', errorHandler);
  window.addEventListener('unhandledrejection', rejectionHandler);
}

/** Remove listeners and dismiss any visible overlay. */
export function uninstallErrorOverlay(): void {
  if (!installed) return;
  installed = false;
  if (errorHandler) window.removeEventListener('error', errorHandler);
  if (rejectionHandler) window.removeEventListener('unhandledrejection', rejectionHandler);
  errorHandler = null;
  rejectionHandler = null;
  entries.length = 0;
  host?.remove();
  host = null;
  shadow = null;
  listEl = null;
}

/** Programmatically surface an error through the overlay (test hook). */
export function reportOverlayError(title: string, err: unknown): void {
  if (!__DEV__) return;
  report(title, err);
}
