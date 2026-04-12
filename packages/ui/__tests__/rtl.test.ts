import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createScope, signal } from '@mikata/reactivity';
import { ThemeProvider, useDirection, createTheme } from '../src/theme';
import { directionalArrowKeys } from '../src/utils/direction';
import { applyThemeToPortal } from '../src/utils/get-color-scheme';
import { Tabs } from '../src/components/Tabs';
import { Drawer } from '../src/components/Drawer';

describe('directionalArrowKeys', () => {
  it('returns Left/Right for horizontal LTR', () => {
    expect(directionalArrowKeys(true, 'ltr')).toEqual({
      prevKey: 'ArrowLeft',
      nextKey: 'ArrowRight',
    });
  });

  it('flips Left/Right for horizontal RTL', () => {
    expect(directionalArrowKeys(true, 'rtl')).toEqual({
      prevKey: 'ArrowRight',
      nextKey: 'ArrowLeft',
    });
  });

  it('returns Up/Down on vertical axis regardless of direction', () => {
    expect(directionalArrowKeys(false, 'ltr')).toEqual({
      prevKey: 'ArrowUp',
      nextKey: 'ArrowDown',
    });
    expect(directionalArrowKeys(false, 'rtl')).toEqual({
      prevKey: 'ArrowUp',
      nextKey: 'ArrowDown',
    });
  });
});

describe('ThemeProvider direction', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('sets dir="ltr" by default', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({}) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.getAttribute('dir')).toBe('ltr');
  });

  it('sets dir="rtl" when direction prop is "rtl"', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({ direction: 'rtl' }) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.getAttribute('dir')).toBe('rtl');
  });

  it('reads direction from theme when prop is not set', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({ theme: { direction: 'rtl' } }) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.getAttribute('dir')).toBe('rtl');
  });

  it('prop overrides theme.direction', () => {
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({ direction: 'ltr', theme: { direction: 'rtl' } }) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.getAttribute('dir')).toBe('ltr');
  });

  it('createTheme passes through direction', () => {
    const theme = createTheme({ direction: 'rtl' });
    expect(theme.direction).toBe('rtl');
    let el!: HTMLElement;
    createScope(() => {
      el = ThemeProvider({ theme }) as HTMLElement;
      container.appendChild(el);
    });
    expect(el.getAttribute('dir')).toBe('rtl');
  });
});

describe('useDirection', () => {
  it('returns "ltr" fallback when used outside ThemeProvider', () => {
    let captured!: () => string;
    createScope(() => {
      captured = useDirection();
    });
    expect(captured()).toBe('ltr');
  });

  it('returns the reactive direction from ThemeProvider', () => {
    let captured!: () => string;
    createScope(() => {
      ThemeProvider({ direction: 'rtl' });
      captured = useDirection();
    });
    expect(captured()).toBe('rtl');
  });
});

describe('Tabs keyboard nav (RTL)', () => {
  const items = [
    { value: 'a', label: 'A', content: 'A' },
    { value: 'b', label: 'B', content: 'B' },
    { value: 'c', label: 'C', content: 'C' },
  ];

  it('ArrowRight moves to previous tab in RTL', () => {
    let el!: HTMLElement;
    createScope(() => {
      const provider = ThemeProvider({ direction: 'rtl' }) as HTMLElement;
      document.body.appendChild(provider);
      el = Tabs({ items, defaultValue: 'b' }) as HTMLElement;
      provider.appendChild(el);
    });
    const tabs = el.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs[1].focus();
    const list = el.querySelector('[role="tablist"]') as HTMLElement;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowLeft moves to next tab in RTL', () => {
    let el!: HTMLElement;
    createScope(() => {
      const provider = ThemeProvider({ direction: 'rtl' }) as HTMLElement;
      document.body.appendChild(provider);
      el = Tabs({ items, defaultValue: 'a' }) as HTMLElement;
      provider.appendChild(el);
    });
    const tabs = el.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs[0].focus();
    const list = el.querySelector('[role="tablist"]') as HTMLElement;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
  });
});

describe('Drawer logical positions', () => {
  const body = () => document.createElement('div');
  const onClose = () => {};

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function renderDrawer(position: 'left' | 'right' | 'start' | 'end') {
    createScope(() => {
      Drawer({ opened: true, position, onClose, children: body() });
    });
    return document.body.querySelector('.mkt-drawer__content') as HTMLElement;
  }

  it('accepts position="start"', () => {
    const content = renderDrawer('start');
    expect(content.dataset.position).toBe('start');
    expect(content.style.width).toBeTruthy();
  });

  it('accepts position="end"', () => {
    const content = renderDrawer('end');
    expect(content.dataset.position).toBe('end');
    expect(content.style.width).toBeTruthy();
  });

  it('still supports physical position="left" / "right"', () => {
    const contentLeft = renderDrawer('left');
    expect(contentLeft.dataset.position).toBe('left');

    document.body.innerHTML = '';
    const contentRight = renderDrawer('right');
    expect(contentRight.dataset.position).toBe('right');
  });
});

describe('applyThemeToPortal propagates direction', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.innerHTML = '';
  });

  it('copies dir from the ThemeProvider wrapper to a portal element', () => {
    createScope(() => {
      const provider = ThemeProvider({ direction: 'rtl' }) as HTMLElement;
      container.appendChild(provider);
    });
    const portal = document.createElement('div');
    applyThemeToPortal(portal);
    expect(portal.getAttribute('dir')).toBe('rtl');
  });
});
