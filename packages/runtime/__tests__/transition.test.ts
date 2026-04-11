/**
 * Tests for transition() and transitionGroup().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transition, transitionGroup } from '../src/transition';
import { signal, flushSync } from '@mikata/reactivity';

// @ts-expect-error — define __DEV__ for tests
globalThis.__DEV__ = true;

describe('transition()', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders content based on condition (like show())', () => {
    const [visible] = signal(true);

    const node = transition(
      () => visible(),
      () => {
        const el = document.createElement('div');
        el.textContent = 'Hello';
        return el;
      }
    );
    container.appendChild(node);
    flushSync();

    expect(container.textContent).toBe('Hello');
  });

  it('swaps to fallback when condition becomes false (no animation)', () => {
    const [visible, setVisible] = signal(true);

    const node = transition(
      () => visible(),
      () => {
        const el = document.createElement('div');
        el.textContent = 'Content';
        return el;
      },
      () => {
        const el = document.createElement('div');
        el.textContent = 'Fallback';
        return el;
      }
      // No transition options → synchronous swap
    );
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('Content');

    setVisible(false);
    flushSync();
    expect(container.textContent).toBe('Fallback');
  });

  it('hides content without fallback (no animation)', () => {
    const [visible, setVisible] = signal(true);

    const node = transition(
      () => visible(),
      () => {
        const el = document.createElement('div');
        el.textContent = 'Plain';
        return el;
      }
    );
    container.appendChild(node);
    flushSync();
    expect(container.textContent).toBe('Plain');

    setVisible(false);
    flushSync();
    // No animation → swaps to a comment node immediately
    expect(container.textContent).toBe('');
  });

  it('applies enter CSS classes when showing', async () => {
    const [visible, setVisible] = signal(false);

    const node = transition(
      () => visible(),
      () => {
        const el = document.createElement('div');
        el.className = 'content';
        el.textContent = 'Entered';
        return el;
      },
      { name: 'fade', duration: 50 }
    );
    container.appendChild(node);
    flushSync();

    // Show the content
    setVisible(true);
    flushSync();

    const content = container.querySelector('.content') as HTMLElement;
    expect(content).toBeTruthy();

    // Enter-active and enter-to should be applied during transition
    expect(content.classList.contains('fade-enter-active')).toBe(true);
    expect(content.classList.contains('fade-enter-to')).toBe(true);

    // Wait for transition to complete
    await new Promise((r) => setTimeout(r, 80));

    // Classes should be cleaned up
    expect(content.classList.contains('fade-enter-active')).toBe(false);
    expect(content.classList.contains('fade-enter-to')).toBe(false);
    expect(content.classList.contains('fade-enter-from')).toBe(false);
  });

  it('applies leave CSS classes before removal (out-in mode)', async () => {
    const [visible, setVisible] = signal(true);

    const node = transition(
      () => visible(),
      () => {
        const el = document.createElement('div');
        el.className = 'target';
        el.textContent = 'Content';
        return el;
      },
      () => {
        const el = document.createElement('div');
        el.textContent = 'Gone';
        return el;
      },
      { name: 'slide', duration: 50, mode: 'out-in' }
    );
    container.appendChild(node);
    flushSync();

    const target = container.querySelector('.target') as HTMLElement;
    expect(target).toBeTruthy();

    setVisible(false);
    flushSync();

    // During leave, the old element should have leave classes
    expect(target.classList.contains('slide-leave-active')).toBe(true);

    // Wait for transition to complete
    await new Promise((r) => setTimeout(r, 80));

    // Old element should be removed and fallback shown
    expect(container.querySelector('.target')).toBeNull();
    expect(container.textContent).toContain('Gone');
  });

  it('calls JS hooks on enter and leave', async () => {
    const hooks = {
      onBeforeEnter: vi.fn(),
      onEnter: vi.fn((el: Element, done: () => void) => done()),
      onAfterEnter: vi.fn(),
      onBeforeLeave: vi.fn(),
      onLeave: vi.fn((el: Element, done: () => void) => done()),
      onAfterLeave: vi.fn(),
    };

    const [visible, setVisible] = signal(false);

    const node = transition(
      () => visible(),
      () => {
        const el = document.createElement('div');
        el.textContent = 'Hooked';
        return el;
      },
      { duration: 0, ...hooks }
    );
    container.appendChild(node);
    flushSync();

    // Enter
    setVisible(true);
    flushSync();
    await new Promise((r) => setTimeout(r, 30));

    expect(hooks.onBeforeEnter).toHaveBeenCalledTimes(1);
    expect(hooks.onEnter).toHaveBeenCalledTimes(1);
    expect(hooks.onAfterEnter).toHaveBeenCalledTimes(1);

    // Leave
    setVisible(false);
    flushSync();
    await new Promise((r) => setTimeout(r, 30));

    expect(hooks.onBeforeLeave).toHaveBeenCalledTimes(1);
    expect(hooks.onLeave).toHaveBeenCalledTimes(1);
    expect(hooks.onAfterLeave).toHaveBeenCalledTimes(1);
  });

  it('supports appear option for initial render animation', async () => {
    const [visible] = signal(true);

    const node = transition(
      () => visible(),
      () => {
        const el = document.createElement('div');
        el.className = 'appear-test';
        el.textContent = 'Appeared';
        return el;
      },
      { name: 'fade', appear: true, duration: 50 }
    );
    container.appendChild(node);
    flushSync();

    // Wait for microtask that schedules appear animation
    await new Promise<void>((r) => queueMicrotask(r));

    const el = container.querySelector('.appear-test')!;
    expect(el).toBeTruthy();
    expect(el.classList.contains('fade-enter-active')).toBe(true);

    await new Promise((r) => setTimeout(r, 80));
    expect(el.classList.contains('fade-enter-active')).toBe(false);
  });

  it('supports custom class names', async () => {
    const [visible, setVisible] = signal(false);

    const node = transition(
      () => visible(),
      () => {
        const el = document.createElement('div');
        el.className = 'custom-test';
        el.textContent = 'Custom';
        return el;
      },
      {
        enterFrom: 'my-enter-start',
        enterActive: 'my-entering',
        enterTo: 'my-enter-end',
        duration: 50,
      }
    );
    container.appendChild(node);
    flushSync();

    setVisible(true);
    flushSync();

    const el = container.querySelector('.custom-test')!;
    expect(el.classList.contains('my-entering')).toBe(true);
    expect(el.classList.contains('my-enter-end')).toBe(true);

    await new Promise((r) => setTimeout(r, 80));

    expect(el.classList.contains('my-entering')).toBe(false);
    expect(el.classList.contains('my-enter-end')).toBe(false);
  });

  it('simultaneous mode: both enter and leave at the same time', async () => {
    const [visible, setVisible] = signal(true);

    const node = transition(
      () => visible(),
      () => {
        const el = document.createElement('div');
        el.className = 'main';
        el.textContent = 'Main';
        return el;
      },
      () => {
        const el = document.createElement('div');
        el.className = 'alt';
        el.textContent = 'Alt';
        return el;
      },
      { name: 'cross', duration: 50 }
    );
    container.appendChild(node);
    flushSync();

    setVisible(false);
    flushSync();

    // Both old and new should be in the DOM during transition
    const main = container.querySelector('.main');
    const alt = container.querySelector('.alt');
    expect(main).toBeTruthy();
    expect(alt).toBeTruthy();
    expect(main!.classList.contains('cross-leave-active')).toBe(true);
    expect(alt!.classList.contains('cross-enter-active')).toBe(true);

    await new Promise((r) => setTimeout(r, 80));

    // After transition, only the new one remains
    expect(container.querySelector('.main')).toBeNull();
    expect(container.querySelector('.alt')).toBeTruthy();
  });
});

describe('transitionGroup()', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders a list of items', () => {
    const [items] = signal(['a', 'b', 'c']);

    const node = transitionGroup(
      () => items(),
      (item) => {
        const el = document.createElement('span');
        el.textContent = item;
        return el;
      }
    );
    container.appendChild(node);
    flushSync();

    expect(container.textContent).toBe('abc');
  });

  it('applies enter classes to new items', async () => {
    const [items, setItems] = signal<string[]>(['a']);

    const node = transitionGroup(
      () => items(),
      (item) => {
        const el = document.createElement('span');
        el.className = `item-${item}`;
        el.textContent = item;
        return el;
      },
      undefined,
      undefined,
      { name: 'list', duration: 50 }
    );
    container.appendChild(node);
    flushSync();

    // Add items
    setItems(['a', 'b', 'c']);
    flushSync();

    expect(container.textContent).toBe('abc');

    // New items should have enter-active class
    const itemB = container.querySelector('.item-b') as HTMLElement;
    const itemC = container.querySelector('.item-c') as HTMLElement;
    expect(itemB.classList.contains('list-enter-active')).toBe(true);
    expect(itemC.classList.contains('list-enter-active')).toBe(true);

    // Existing item should NOT have enter class
    const itemA = container.querySelector('.item-a') as HTMLElement;
    expect(itemA.classList.contains('list-enter-active')).toBe(false);

    await new Promise((r) => setTimeout(r, 80));
    expect(itemB.classList.contains('list-enter-active')).toBe(false);
  });

  it('applies leave classes to removed items', async () => {
    const [items, setItems] = signal(['a', 'b', 'c']);

    const node = transitionGroup(
      () => items(),
      (item) => {
        const el = document.createElement('span');
        el.className = `item-${item}`;
        el.textContent = item;
        return el;
      },
      undefined,
      undefined,
      { name: 'list', duration: 50 }
    );
    container.appendChild(node);
    flushSync();

    const itemB = container.querySelector('.item-b') as HTMLElement;

    // Remove 'b'
    setItems(['a', 'c']);
    flushSync();

    // itemB should still be in DOM with leave class
    expect(itemB.classList.contains('list-leave-active')).toBe(true);

    await new Promise((r) => setTimeout(r, 80));

    // After transition, itemB removed
    expect(container.querySelector('.item-b')).toBeNull();
    expect(container.textContent).toBe('ac');
  });

  it('shows fallback when list is empty', () => {
    const [items] = signal<string[]>([]);

    const node = transitionGroup(
      () => items(),
      (item) => {
        const el = document.createElement('span');
        el.textContent = item;
        return el;
      },
      () => {
        const el = document.createElement('div');
        el.textContent = 'No items';
        return el;
      }
    );
    container.appendChild(node);
    flushSync();

    expect(container.textContent).toBe('No items');
  });

  it('uses key function for reconciliation', () => {
    const [items, setItems] = signal([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    const node = transitionGroup(
      () => items(),
      (item) => {
        const el = document.createElement('span');
        el.textContent = item.name;
        return el;
      },
      undefined,
      { key: (item) => item.id }
    );
    container.appendChild(node);
    flushSync();

    expect(container.textContent).toBe('AliceBob');

    setItems([
      { id: 2, name: 'Bob' },
      { id: 1, name: 'Alice' },
    ]);
    flushSync();

    expect(container.textContent).toBe('BobAlice');
  });

  it('calls JS enter hooks for new items', async () => {
    const enterHook = vi.fn((el: Element, done: () => void) => done());

    const [items, setItems] = signal<string[]>([]);

    const node = transitionGroup(
      () => items(),
      (item) => {
        const el = document.createElement('span');
        el.textContent = item;
        return el;
      },
      undefined,
      undefined,
      { onEnter: enterHook, duration: 0 }
    );
    container.appendChild(node);
    flushSync();

    setItems(['x', 'y']);
    flushSync();

    await new Promise((r) => setTimeout(r, 30));

    expect(enterHook).toHaveBeenCalledTimes(2);
  });

  it('transitions between list and fallback', async () => {
    const [items, setItems] = signal(['a', 'b']);

    const node = transitionGroup(
      () => items(),
      (item) => {
        const el = document.createElement('span');
        el.className = `item-${item}`;
        el.textContent = item;
        return el;
      },
      () => {
        const el = document.createElement('div');
        el.className = 'empty';
        el.textContent = 'Empty';
        return el;
      },
      undefined,
      { name: 'list', duration: 50 }
    );
    container.appendChild(node);
    flushSync();

    expect(container.textContent).toBe('ab');

    // Clear list — items should animate out
    setItems([]);
    flushSync();

    // Items should still be in DOM during leave
    expect(container.querySelector('.item-a')).toBeTruthy();

    await new Promise((r) => setTimeout(r, 80));

    // Items removed, fallback shown
    expect(container.querySelector('.item-a')).toBeNull();
    expect(container.textContent).toContain('Empty');
  });
});
