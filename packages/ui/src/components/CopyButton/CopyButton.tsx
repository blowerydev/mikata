import { onCleanup } from '@mikata/runtime';
import type { CopyButtonProps } from './CopyButton.types';

/**
 * Render-prop wrapper that provides a `copy` function and a `copied` flag.
 * Returns a fragment-like wrapper that swaps its child when `copied` toggles.
 */
export function CopyButton(props: CopyButtonProps): HTMLElement {
  const { value, timeout = 1000, children, onCopy } = props;

  // Use a display-contents wrapper so it doesn't introduce layout
  const wrapper = document.createElement('span');
  wrapper.className = 'mkt-copy-button';
  wrapper.style.display = 'contents';

  let copied = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const render = () => {
    wrapper.textContent = '';
    const node = children({ copy, copied });
    wrapper.appendChild(node);
  };

  const copy = () => {
    const done = () => {
      copied = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        copied = false;
        render();
      }, timeout);
      onCopy?.(value);
      render();
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(() => {
        // fall back to legacy
        fallback();
      });
    } else {
      fallback();
    }
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      done();
    }
  };

  render();

  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  return wrapper;
}
