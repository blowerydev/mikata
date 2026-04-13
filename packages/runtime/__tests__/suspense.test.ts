import { describe, it, expect } from 'vitest';
import {
  createScope,
  signal,
  flushSync,
  getCurrentScope,
} from '@mikata/reactivity';
import { Suspense, SUSPENSE_CONTEXT_KEY, type SuspenseBoundary } from '../src/suspense';
import { render } from '../src/render';
import { _createComponent } from '../src/component';

function nextMicrotask(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}

function registerWithNearestBoundary(isLoading: ReturnType<typeof signal>[0]): void {
  let s = getCurrentScope();
  while (s) {
    const b = s.contexts.get(SUSPENSE_CONTEXT_KEY);
    if (b) {
      (b as SuspenseBoundary).register(isLoading);
      return;
    }
    s = s.parent;
  }
}

describe('Suspense', () => {
  it('renders children immediately when no query registers', () => {
    const host = document.createElement('div');
    const dispose = render(
      () =>
        Suspense({
          fallback: document.createTextNode('...'),
          children: () => {
            const n = document.createElement('span');
            n.textContent = 'ready';
            return n;
          },
        }),
      host
    );
    flushSync();
    expect(host.textContent).toBe('ready');
    dispose();
  });

  it('renders fallback while a registered query reports loading', () => {
    const host = document.createElement('div');
    const [loading, setLoading] = signal(true);

    const Child = (): Node => {
      registerWithNearestBoundary(loading);
      const node = document.createElement('span');
      node.textContent = 'loaded';
      return node;
    };

    const dispose = render(
      () =>
        Suspense({
          fallback: document.createTextNode('loading…'),
          children: () => _createComponent(Child, {}),
        }),
      host
    );
    flushSync();

    expect(host.textContent).toBe('loading…');

    setLoading(false);
    flushSync();
    expect(host.textContent).toBe('loaded');

    dispose();
  });

  it('does not revert to fallback on later loading transitions (refetch)', () => {
    const host = document.createElement('div');
    const [loading, setLoading] = signal(true);

    const Child = (): Node => {
      registerWithNearestBoundary(loading);
      const node = document.createElement('span');
      node.textContent = 'data';
      return node;
    };

    const dispose = render(
      () =>
        Suspense({
          fallback: document.createTextNode('loading…'),
          children: () => _createComponent(Child, {}),
        }),
      host
    );
    flushSync();

    setLoading(false);
    flushSync();
    expect(host.textContent).toBe('data');

    setLoading(true);
    flushSync();
    expect(host.textContent).toBe('data');
    setLoading(false);
    flushSync();
    expect(host.textContent).toBe('data');

    dispose();
  });

  it('waits for every registered query before swapping to children', () => {
    const host = document.createElement('div');
    const [a, setA] = signal(true);
    const [b, setB] = signal(true);

    const Child = (): Node => {
      registerWithNearestBoundary(a);
      registerWithNearestBoundary(b);
      const node = document.createElement('span');
      node.textContent = 'both';
      return node;
    };

    const dispose = render(
      () =>
        Suspense({
          fallback: document.createTextNode('loading…'),
          children: () => _createComponent(Child, {}),
        }),
      host
    );
    flushSync();
    expect(host.textContent).toBe('loading…');

    setA(false);
    flushSync();
    expect(host.textContent).toBe('loading…');

    setB(false);
    flushSync();
    expect(host.textContent).toBe('both');

    dispose();
  });
});

describe('Suspense + createQuery integration', async () => {
  const { createQuery } = await import('../../store/src/query');

  it('shows fallback until createQuery({ suspend: true }) resolves', async () => {
    const host = document.createElement('div');

    const Child = (): Node => {
      createQuery({
        key: () => 'k',
        fn: async () => {
          await nextMicrotask();
          return 42;
        },
        suspend: true,
      });
      const node = document.createElement('span');
      node.textContent = 'done';
      return node;
    };

    const dispose = render(
      () =>
        Suspense({
          fallback: document.createTextNode('loading…'),
          children: () => _createComponent(Child, {}),
        }),
      host
    );
    flushSync();

    expect(host.textContent).toBe('loading…');

    await nextMicrotask();
    await nextMicrotask();
    flushSync();

    expect(host.textContent).toBe('done');
    dispose();
  });

  it('ignores queries without suspend: true', () => {
    const host = document.createElement('div');

    const Child = (): Node => {
      createQuery({
        key: () => 'k',
        fn: async () => {
          await nextMicrotask();
          return 1;
        },
      });
      const node = document.createElement('span');
      node.textContent = 'ready';
      return node;
    };

    const dispose = render(
      () =>
        Suspense({
          fallback: document.createTextNode('loading…'),
          children: () => _createComponent(Child, {}),
        }),
      host
    );
    flushSync();

    expect(host.textContent).toBe('ready');
    dispose();
  });
});

describe('Suspense scope wiring', () => {
  it('sets SUSPENSE_CONTEXT_KEY on the children scope via scope.contexts', () => {
    let seenBoundary: unknown = null;
    createScope(() => {
      const host = document.createElement('div');
      const Child = (): Node => {
        let s = getCurrentScope();
        while (s) {
          const b = s.contexts.get(SUSPENSE_CONTEXT_KEY);
          if (b) { seenBoundary = b; break; }
          s = s.parent;
        }
        return document.createTextNode('x');
      };
      render(
        () =>
          Suspense({
            fallback: document.createTextNode('...'),
            children: () => _createComponent(Child, {}),
          }),
        host
      );
      flushSync();
    });
    expect(seenBoundary).not.toBeNull();
    expect(typeof (seenBoundary as SuspenseBoundary).register).toBe('function');
  });
});
