/**
 * @mikata/testing — testing utilities for Mikata components.
 *
 * Provides renderComponent(), fireEvent(), waitForUpdate(), and
 * DOM query helpers to make testing ergonomic.
 */

import { flushSync } from '@mikata/reactivity';
import { render, _createComponent } from '@mikata/runtime';

/**
 * Result of renderComponent() — provides query helpers and cleanup.
 */
export interface RenderResult {
  /** The container element the component was rendered into */
  container: HTMLElement;

  /** Dispose the component and clean up */
  dispose: () => void;

  /** Get element by CSS selector. Throws if not found. */
  get: (selector: string) => HTMLElement;

  /** Get element by CSS selector. Returns null if not found. */
  query: (selector: string) => HTMLElement | null;

  /** Get all elements matching a CSS selector */
  getAll: (selector: string) => HTMLElement[];

  /** Find element by text content (partial match) */
  findByText: (text: string, selector?: string) => HTMLElement | null;

  /** Find all elements by text content (partial match) */
  findAllByText: (text: string, selector?: string) => HTMLElement[];

  /** Shortcut: container.textContent */
  text: () => string;

  /** Shortcut: container.innerHTML */
  html: () => string;
}

/**
 * Render a component into a detached container for testing.
 *
 * Usage:
 *   const { get, text, dispose } = renderComponent(Counter, { initial: 0 });
 *   expect(text()).toContain('Count: 0');
 *   fireEvent.click(get('button'));
 *   await waitForUpdate();
 *   expect(text()).toContain('Count: 1');
 *   dispose();
 */
export function renderComponent<P extends Record<string, unknown>>(
  Comp: (props: P) => Node | null,
  props?: P
): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const dispose = render(
    () => _createComponent(Comp, (props ?? {}) as P),
    container
  );

  function get(selector: string): HTMLElement {
    const el = container.querySelector(selector) as HTMLElement | null;
    if (!el) {
      throw new Error(
        `[mikata/testing] get("${selector}") found no matching element.\n` +
        `Container HTML: ${container.innerHTML}`
      );
    }
    return el;
  }

  function query(selector: string): HTMLElement | null {
    return container.querySelector(selector) as HTMLElement | null;
  }

  function getAll(selector: string): HTMLElement[] {
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  function findByText(text: string, selector: string = '*'): HTMLElement | null {
    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    return elements.find(el => el.textContent?.includes(text)) ?? null;
  }

  function findAllByText(text: string, selector: string = '*'): HTMLElement[] {
    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    return elements.filter(el => el.textContent?.includes(text));
  }

  return {
    container,
    dispose: () => {
      dispose();
      container.remove();
    },
    get,
    query,
    getAll,
    findByText,
    findAllByText,
    text: () => container.textContent ?? '',
    html: () => container.innerHTML,
  };
}

/**
 * Render raw JSX/DOM content into a container for testing.
 * Use this when you don't have a component function — just a render function.
 *
 * Usage:
 *   const { text, dispose } = renderContent(() => {
 *     const el = document.createElement('p');
 *     el.textContent = 'Hello';
 *     return el;
 *   });
 */
export function renderContent(fn: () => Node): RenderResult {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const dispose = render(
    () => fn(),
    container
  );

  function get(selector: string): HTMLElement {
    const el = container.querySelector(selector) as HTMLElement | null;
    if (!el) {
      throw new Error(
        `[mikata/testing] get("${selector}") found no matching element.\n` +
        `Container HTML: ${container.innerHTML}`
      );
    }
    return el;
  }

  function query(selector: string): HTMLElement | null {
    return container.querySelector(selector) as HTMLElement | null;
  }

  function getAll(selector: string): HTMLElement[] {
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  function findByText(text: string, selector: string = '*'): HTMLElement | null {
    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    return elements.find(el => el.textContent?.includes(text)) ?? null;
  }

  function findAllByText(text: string, selector: string = '*'): HTMLElement[] {
    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    return elements.filter(el => el.textContent?.includes(text));
  }

  return {
    container,
    dispose: () => {
      dispose();
      container.remove();
    },
    get,
    query,
    getAll,
    findByText,
    findAllByText,
    text: () => container.textContent ?? '',
    html: () => container.innerHTML,
  };
}

/**
 * Fire a DOM event on an element.
 *
 * Usage:
 *   fireEvent.click(button);
 *   fireEvent.input(input, { target: { value: 'hello' } });
 *   fireEvent(element, 'custom-event', { detail: 42 });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEventInit = any;

export function fireEvent(
  element: Element,
  eventName: string,
  eventInit?: AnyEventInit
): void {
  const event = createEvent(eventName, eventInit);
  applyEventProperties(event, eventInit);
  element.dispatchEvent(event);
}

function createEvent(
  eventName: string,
  init?: AnyEventInit
): Event {
  const bubbles = init?.bubbles ?? true;
  const cancelable = init?.cancelable ?? true;

  if (eventName.startsWith('mouse') || eventName === 'click' || eventName === 'dblclick' || eventName === 'contextmenu') {
    return new MouseEvent(eventName, { bubbles, cancelable, ...init });
  }
  if (eventName.startsWith('key')) {
    return new KeyboardEvent(eventName, { bubbles, cancelable, ...init });
  }
  if (eventName === 'input' || eventName === 'change' || eventName === 'beforeinput') {
    return new InputEvent(eventName, { bubbles, cancelable, ...init });
  }
  if (eventName.startsWith('focus') || eventName === 'blur') {
    return new FocusEvent(eventName, { bubbles, cancelable, ...init });
  }
  return new Event(eventName, { bubbles, cancelable, ...init });
}

function applyEventProperties(
  event: Event,
  init?: AnyEventInit
): void {
  if (!init) return;
  if (init.target && typeof init.target === 'object') {
    Object.defineProperty(event, 'target', {
      value: init.target,
      writable: false,
    });
  }
}

// Convenience methods for common events
fireEvent.click = (element: Element, init?: MouseEventInit) =>
  fireEvent(element, 'click', init);

fireEvent.dblclick = (element: Element, init?: MouseEventInit) =>
  fireEvent(element, 'dblclick', init);

fireEvent.input = (element: Element, init?: { target?: { value?: string } }) => {
  if (init?.target?.value !== undefined) {
    (element as HTMLInputElement).value = init.target.value;
  }
  fireEvent(element, 'input', init);
};

fireEvent.change = (element: Element, init?: { target?: { value?: string; checked?: boolean } }) => {
  if (init?.target?.value !== undefined) {
    (element as HTMLInputElement).value = init.target.value;
  }
  if (init?.target?.checked !== undefined) {
    (element as HTMLInputElement).checked = init.target.checked;
  }
  fireEvent(element, 'change', init);
};

fireEvent.keyDown = (element: Element, init?: KeyboardEventInit) =>
  fireEvent(element, 'keydown', init);

fireEvent.keyUp = (element: Element, init?: KeyboardEventInit) =>
  fireEvent(element, 'keyup', init);

fireEvent.keyPress = (element: Element, init?: KeyboardEventInit) =>
  fireEvent(element, 'keypress', init);

fireEvent.focus = (element: Element, init?: FocusEventInit) =>
  fireEvent(element, 'focus', init);

fireEvent.blur = (element: Element, init?: FocusEventInit) =>
  fireEvent(element, 'blur', init);

fireEvent.submit = (element: Element, init?: EventInit) =>
  fireEvent(element, 'submit', init);

/**
 * Flush all pending reactive updates synchronously, then wait
 * one microtask for any async effects to settle.
 *
 * Usage:
 *   setCount(5);
 *   await waitForUpdate();
 *   expect(text()).toBe('5');
 */
export async function waitForUpdate(): Promise<void> {
  flushSync();
  await new Promise<void>(resolve => queueMicrotask(resolve));
}

/**
 * Flush all pending reactive updates synchronously.
 * Use this when you don't need to await async effects.
 *
 * Usage:
 *   setCount(5);
 *   flush();
 *   expect(text()).toBe('5');
 */
export function flush(): void {
  flushSync();
}

// Re-export flushSync for convenience
export { flushSync } from '@mikata/reactivity';
