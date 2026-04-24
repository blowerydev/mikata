import { _mergeProps, adoptElement, onCleanup } from '@mikata/runtime';
import type { CopyButtonProps } from './CopyButton.types';

/**
 * Render-prop wrapper that provides a `copy` function and a `copied`
 * flag. Swaps its child when `copied` toggles.
 */
export function CopyButton(userProps: CopyButtonProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as CopyButtonProps;
  const children = props.children;

  let copied = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return adoptElement<HTMLElement>('span', (wrapper) => {
    wrapper.className = 'mkt-copy-button';
    wrapper.style.display = 'contents';

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
        }, props.timeout ?? 1000);
        props.onCopy?.(props.value);
        render();
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(props.value).then(done).catch(() => {
          fallback();
        });
      } else {
        fallback();
      }
      function fallback() {
        const ta = document.createElement('textarea');
        ta.value = props.value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch { /* ignored */ }
        document.body.removeChild(ta);
        done();
      }
    };

    // Initial render only when empty. On hydration the SSR already
    // ran `children({copy, copied: false})` to produce the wrapped
    // node; skip rebuilding so the adopted child and its handlers
    // survive. Client-side post-copy re-renders still mutate freely.
    if (!wrapper.firstChild) render();
  });
}
