import { signal, onCleanup, type ReadSignal } from '@mikata/reactivity';

export interface ClipboardReturn {
  copied: ReadSignal<boolean>;
  error: ReadSignal<Error | null>;
  copy: (text: string) => Promise<void>;
  reset: () => void;
}

/**
 * Copy text to the clipboard. `copied` flips true for `timeout` ms after a successful copy.
 *
 * Usage:
 *   const { copied, copy } = createClipboard();
 *   <button onClick={() => copy('hello')}>Copy</button>
 */
export function createClipboard(timeout: number = 2000): ClipboardReturn {
  const [copied, setCopied] = signal(false);
  const [error, setError] = signal<Error | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const copy = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setError(null);
      setCopied(true);
      clearTimer();
      timer = setTimeout(() => setCopied(false), timeout);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setCopied(false);
    }
  };

  const reset = () => {
    clearTimer();
    setCopied(false);
    setError(null);
  };

  onCleanup(clearTimer);

  return { copied, error, copy, reset };
}
