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

function radios(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    container.querySelectorAll('.theme-toggle__option'),
  ) as HTMLButtonElement[];
}

afterEach(() => {
  setColorScheme('auto');
  localStorage.removeItem('mikata-docs-theme');
  document.body.innerHTML = '';
});

describe('ThemeToggle', () => {
  it('uses a roving tabindex with the active option as the only tab stop', () => {
    setColorScheme('auto');
    const { container, dispose } = mount();
    try {
      const buttons = radios(container);
      expect(buttons.map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
      expect(buttons.map((b) => b.getAttribute('aria-checked'))).toEqual([
        'false',
        'true',
        'false',
      ]);
    } finally {
      dispose();
    }
  });

  it('ArrowRight moves focus and selection to the next option', () => {
    setColorScheme('auto');
    const { container, dispose } = mount();
    try {
      const buttons = radios(container);
      buttons[1]!.focus();
      buttons[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      flushSync();

      expect(document.activeElement).toBe(buttons[2]);
      expect(buttons.map((b) => b.tabIndex)).toEqual([-1, -1, 0]);
      expect(buttons.map((b) => b.getAttribute('aria-checked'))).toEqual([
        'false',
        'false',
        'true',
      ]);
    } finally {
      dispose();
    }
  });

  it('ArrowLeft wraps focus and selection to the previous option', () => {
    setColorScheme('light');
    const { container, dispose } = mount();
    try {
      const buttons = radios(container);
      buttons[0]!.focus();
      buttons[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      flushSync();

      expect(document.activeElement).toBe(buttons[2]);
      expect(buttons.map((b) => b.tabIndex)).toEqual([-1, -1, 0]);
      expect(buttons.map((b) => b.getAttribute('aria-checked'))).toEqual([
        'false',
        'false',
        'true',
      ]);
    } finally {
      dispose();
    }
  });

  it('Home and End jump to the first and last options', () => {
    setColorScheme('auto');
    const { container, dispose } = mount();
    try {
      const buttons = radios(container);

      buttons[1]!.focus();
      buttons[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      flushSync();
      expect(document.activeElement).toBe(buttons[2]);
      expect(buttons[2]!.getAttribute('aria-checked')).toBe('true');

      buttons[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      flushSync();
      expect(document.activeElement).toBe(buttons[0]);
      expect(buttons[0]!.getAttribute('aria-checked')).toBe('true');
    } finally {
      dispose();
    }
  });
});
