import { describe, it, expect } from 'vitest';
import { signal, effect, flushSync } from '@mikata/reactivity';
import { mergeProps, reactiveProps } from '../src/index';

describe('mergeProps', () => {
  it('merges plain values, later sources winning', () => {
    const out = mergeProps({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(out).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('preserves getter descriptors across merges', () => {
    let reads = 0;
    const source = Object.defineProperty({} as Record<string, unknown>, 'size', {
      get: () => { reads++; return 'md'; },
      enumerable: true,
      configurable: true,
    });
    const merged = mergeProps({ size: 'sm' }, source);
    // First access goes through the getter (from the later source).
    expect(merged.size).toBe('md');
    expect(reads).toBe(1);
    // Second access hits the getter again - not a frozen value.
    expect(merged.size).toBe('md');
    expect(reads).toBe(2);
  });

  it('getter on an early source survives if no later source overrides the key', () => {
    let reads = 0;
    const source = Object.defineProperty({} as Record<string, unknown>, 'color', {
      get: () => { reads++; return 'primary'; },
      enumerable: true,
      configurable: true,
    });
    const merged = mergeProps(source, { size: 'md' });
    expect(merged.color).toBe('primary');
    expect(reads).toBe(1);
  });
});

describe('reactiveProps', () => {
  it('wires each key to its getter function', () => {
    const [size, setSize] = signal<'sm' | 'md'>('md');
    const [color, setColor] = signal('primary');
    const props = reactiveProps({ size, color });
    expect(props.size).toBe('md');
    expect(props.color).toBe('primary');
    setSize('sm');
    setColor('accent');
    expect(props.size).toBe('sm');
    expect(props.color).toBe('accent');
  });

  it('reads inside an effect subscribe to their underlying signals', () => {
    const [size, setSize] = signal<'sm' | 'md'>('md');
    const props = reactiveProps({ size });
    const seen: string[] = [];
    const dispose = effect(() => { seen.push(props.size); });
    flushSync();
    expect(seen).toEqual(['md']);
    setSize('sm');
    flushSync();
    expect(seen).toEqual(['md', 'sm']);
    dispose();
  });

  it('produces enumerable + configurable descriptors so mergeProps accepts them', () => {
    const [size] = signal('md');
    const reactive = reactiveProps({ size });
    const merged = mergeProps({ size: 'sm' }, reactive);
    // The reactive source came last, so its getter overrides the plain 'sm'.
    expect(merged.size).toBe('md');
    const desc = Object.getOwnPropertyDescriptor(merged, 'size')!;
    expect(typeof desc.get).toBe('function');
    expect(desc.enumerable).toBe(true);
    expect(desc.configurable).toBe(true);
  });
});
