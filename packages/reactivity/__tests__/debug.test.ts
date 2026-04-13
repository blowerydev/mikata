/**
 * Tests for the reactive debug registry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  signal,
  computed,
  effect,
  getGraphSnapshot,
  getStats,
  findNodeById,
  traceDependencies,
  traceSubscribers,
  getNodesByKind,
  findNodesByLabel,
  _resetDebugRegistry,
  flushSync,
} from '../src/index';

// @ts-expect-error - define __DEV__ for tests
globalThis.__DEV__ = true;

describe('Debug Registry', () => {
  beforeEach(() => {
    _resetDebugRegistry();
  });

  it('tracks signals', () => {
    const [count] = signal(42, 'count');
    const stats = getStats();
    expect(stats.signals).toBe(1);
    expect(stats.total).toBe(1);
  });

  it('tracks computed values', () => {
    const [count] = signal(5, 'count');
    const doubled = computed(() => count() * 2, 'doubled');
    doubled(); // trigger initial compute
    const stats = getStats();
    expect(stats.signals).toBe(1);
    expect(stats.computeds).toBe(1);
  });

  it('tracks effects', () => {
    const [count, setCount] = signal(0, 'count');
    const dispose = effect(() => {
      count();
    }, 'logger');

    const stats = getStats();
    expect(stats.effects).toBe(1);

    dispose();
    const statsAfter = getStats();
    expect(statsAfter.effects).toBe(0);
  });

  it('takes graph snapshots', () => {
    const [count, setCount] = signal(0, 'count');
    const doubled = computed(() => count() * 2, 'doubled');
    const dispose = effect(() => {
      doubled();
    }, 'watcher');

    const graph = getGraphSnapshot();
    expect(graph.signals.length).toBe(1);
    expect(graph.computeds.length).toBe(1);
    expect(graph.effects.length).toBe(1);

    // Signal should have value
    expect(graph.signals[0].value).toBe(0);
    expect(graph.signals[0].label).toBe('count');

    // Computed should have value
    expect(graph.computeds[0].value).toBe(0);
    expect(graph.computeds[0].label).toBe('doubled');

    dispose();
  });

  it('reads current values in snapshots', () => {
    const [count, setCount] = signal(10, 'count');
    const doubled = computed(() => count() * 2, 'doubled');
    doubled(); // read to initialize

    let graph = getGraphSnapshot();
    expect(graph.signals[0].value).toBe(10);
    expect(graph.computeds[0].value).toBe(20);

    setCount(25);
    flushSync();
    doubled(); // read to update computed

    graph = getGraphSnapshot();
    expect(graph.signals[0].value).toBe(25);
    expect(graph.computeds[0].value).toBe(50);
  });

  it('finds nodes by ID', () => {
    const [count] = signal(0, 'mySignal');
    const stats = getStats();
    expect(stats.signals).toBe(1);

    const graph = getGraphSnapshot();
    const id = graph.signals[0].id;
    const found = findNodeById(id);
    expect(found).toBeDefined();
    expect(found!.label).toBe('mySignal');
  });

  it('traces dependencies', () => {
    const [a] = signal(1, 'a');
    const [b] = signal(2, 'b');
    const sum = computed(() => a() + b(), 'sum');
    const dispose = effect(() => {
      sum();
    }, 'watcher');

    const graph = getGraphSnapshot();
    const effectNode = graph.effects[0];

    // Trace what 'watcher' depends on
    const deps = traceDependencies(effectNode.id);
    expect(deps.length).toBeGreaterThanOrEqual(2);

    // Should include the effect itself, the computed, and the signals
    const labels = deps.map((d) => d.label).filter(Boolean);
    expect(labels).toContain('watcher');
    expect(labels).toContain('sum');

    dispose();
  });

  it('traces subscribers', () => {
    const [count, setCount] = signal(0, 'count');
    const doubled = computed(() => count() * 2, 'doubled');
    const dispose = effect(() => {
      doubled();
    }, 'consumer');

    const graph = getGraphSnapshot();
    const signalNode = graph.signals[0];

    // Trace what depends on 'count'
    const subs = traceSubscribers(signalNode.id);
    const labels = subs.map((s) => s.label).filter(Boolean);
    expect(labels).toContain('count');
    expect(labels).toContain('doubled');

    dispose();
  });

  it('lists nodes by kind', () => {
    signal(1, 'x');
    signal(2, 'y');
    signal(3, 'z');

    const signals = getNodesByKind('signal');
    expect(signals.length).toBe(3);
  });

  it('searches by label', () => {
    signal(1, 'user-name');
    signal(2, 'user-email');
    signal(3, 'cart-total');

    const results = findNodesByLabel('user');
    expect(results.length).toBe(2);
    expect(results.map((r) => r.label)).toContain('user-name');
    expect(results.map((r) => r.label)).toContain('user-email');
  });

  it('includes creation stack trace', () => {
    signal(0, 'traced');
    const graph = getGraphSnapshot();
    expect(graph.signals[0].createdAt).toBeTruthy();
    expect(typeof graph.signals[0].createdAt).toBe('string');
  });

  it('tracks dependency counts', () => {
    const [a] = signal(1, 'a');
    const [b] = signal(2, 'b');
    const sum = computed(() => a() + b(), 'sum');
    sum(); // trigger
    const dispose = effect(() => {
      sum();
    }, 'fx');

    const graph = getGraphSnapshot();
    const computedNode = graph.computeds.find((n) => n.label === 'sum')!;
    expect(computedNode.sourceCount).toBe(2); // depends on a and b
    expect(computedNode.subscriberCount).toBe(1); // fx subscribes to it

    dispose();
  });

  it('unregisters disposed nodes', () => {
    const [count] = signal(0, 'count');
    const dispose1 = effect(() => { count(); }, 'fx1');
    const dispose2 = effect(() => { count(); }, 'fx2');

    expect(getStats().effects).toBe(2);

    dispose1();
    expect(getStats().effects).toBe(1);

    dispose2();
    expect(getStats().effects).toBe(0);
  });
});
