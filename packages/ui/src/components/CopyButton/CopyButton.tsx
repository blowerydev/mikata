import { _mergeProps, onCleanup } from '@mikata/runtime';
import type { CopyButtonProps } from './CopyButton.types';

/**
 * Render-prop wrapper that provides a `copy` function and a `copied` flag.
 * Returns a fragment-like wrapper that swaps its child when `copied` toggles.
 */
export function CopyButton(userProps: CopyButtonProps): HTMLElement {
  const props = _mergeProps(userProps as unknown as Record<string, unknown>) as unknown as CopyButtonProps;

  // `children` is the render function, captured once.
  const children = props.children;

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
