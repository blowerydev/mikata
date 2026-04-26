import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@mikata/runtime';
import { flushSync } from '@mikata/reactivity';
import { ThemeToggle } from './ThemeToggle';
import { setColorScheme } from '../theme-state';

function mount(): { container: HTMLElement; dispose: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const disposeRender = render(ThemeToggle, container);
  return {
    container,
    dispose: () => {
      disposeRender();
      container.remove();
    },
  };
}

function radios(container: HTMLElement): HTMLInputElement[] {
  return Array.from(
    container.querySelectorAll('.theme-toggle input[type="radio"]'),
  ) as HTMLInputElement[];
}

afterEach(() => {
  setColorScheme('auto');
  localStorage.removeItem('mikata-docs-theme');
  document.body.innerHTML = '';
});

describe('ThemeToggle', () => {
  it('renders an accessible SegmentedControl with the active option checked', () => {
    setColorScheme('auto');
    const { container, dispose } = mount();
    try {
      const root = container.querySelector('.theme-toggle') as HTMLElement | null;
      expect(root?.getAttribute('role')).toBe('radiogroup');
      expect(root?.getAttribute('aria-label')).toBe('Color theme');
      const buttons = radios(container);
      expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
        'Light',
        'System',
        'Dark',
      ]);
      expect(buttons.map((b) => b.checked)).toEqual([false, true, false]);
    } finally {
      dispose();
    }
  });

  it('clicking an option updates selection', () => {
    setColorScheme('auto');
    const { container, dispose } = mount();
    try {
      const buttons = radios(container);
      buttons[2]!.checked = true;
      buttons[2]!.dispatchEvent(new Event('change', { bubbles: true }));
      flushSync();

      expect(buttons.map((b) => b.checked)).toEqual([false, false, true]);
    } finally {
      dispose();
    }
  });

  it('reacts when the color scheme signal changes externally', () => {
    setColorScheme('light');
    const { container, dispose } = mount();
    try {
      const buttons = radios(container);
      expect(buttons.map((b) => b.checked)).toEqual([true, false, false]);

      setColorScheme('dark');
      flushSync();

      expect(buttons.map((b) => b.checked)).toEqual([false, false, true]);
    } finally {
      dispose();
    }
  });
});
