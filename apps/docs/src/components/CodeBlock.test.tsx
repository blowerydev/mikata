import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@mikata/runtime';
import { flushSync } from '@mikata/reactivity';
import { fireEvent } from '@mikata/testing';
import { CodeBlock } from './CodeBlock';

const html = '<pre><code><span>const value = 1;</span></code></pre>';

function mount(): { container: HTMLElement; dispose: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const disposeRender = render(() => <CodeBlock html={html} />, container);
  return {
    container,
    dispose: () => {
      disposeRender();
      container.remove();
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('CodeBlock', () => {
  it('keeps a stable two-icon copy button across copied state changes', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { container, dispose } = mount();
    try {
      const button = container.querySelector('.codeblock-copy') as HTMLButtonElement | null;
      expect(button).toBeTruthy();
      expect(button!.getAttribute('aria-label')).toBe('Copy code');
      expect(button!.querySelectorAll('svg')).toHaveLength(2);

      fireEvent.click(button!);
      await Promise.resolve();
      flushSync();

      expect(writeText).toHaveBeenCalledWith('const value = 1;');
      expect(button!.getAttribute('data-copied')).toBe('true');
      expect(button!.getAttribute('aria-label')).toBe('Code copied');
      expect(button!.querySelectorAll('svg')).toHaveLength(2);

      vi.advanceTimersByTime(1600);
      flushSync();

      expect(button!.getAttribute('data-copied')).toBe('false');
      expect(button!.querySelectorAll('svg')).toHaveLength(2);
    } finally {
      dispose();
    }
  });
});
