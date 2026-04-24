import { describe, it, expect } from 'vitest';
import { signal, effect, flushSync } from '@mikata/reactivity';
import { mergeProps, reactiveProps, splitProps } from '../src/index';

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

describe('mergeProps typing', () => {
  it('returns intersection of source types without a cast', () => {
    // Compile-time assertion: merged is typed { a: number } & { b: string }.
    const merged = mergeProps({ a: 1 }, { b: 'x' });
    const a: number = merged.a;
    const b: string = merged.b;
    expect(a).toBe(1);
    expect(b).toBe('x');
  });
});

describe('splitProps', () => {
  it('returns [picked, rest] with keys partitioned', () => {
    const source = { a: 1, b: 2, c: 3 };
    const [picked, rest] = splitProps(source, ['a', 'c']);
    expect(picked).toEqual({ a: 1, c: 3 });
    expect(rest).toEqual({ b: 2 });
  });

  it('preserves getter descriptors on both halves', () => {
    let sizeReads = 0;
    let colorReads = 0;
    const source = {} as { size: string; color: string };
    Object.defineProperty(source, 'size', {
      get: () => { sizeReads++; return 'md'; },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(source, 'color', {
      get: () => { colorReads++; return 'primary'; },
      enumerable: true,
      configurable: true,
    });

    const [picked, rest] = splitProps(source, ['size']);
    // No reads during split itself.
    expect(sizeReads).toBe(0);
    expect(colorReads).toBe(0);

    expect(picked.size).toBe('md');
    expect(sizeReads).toBe(1);
    // Second access re-invokes the getter - not frozen.
    expect(picked.size).toBe('md');
    expect(sizeReads).toBe(2);

    expect(rest.color).toBe('primary');
    expect(colorReads).toBe(1);
  });

  it('keeps reactivity live on the picked half', () => {
    const [size, setSize] = signal<'sm' | 'md'>('md');
    const source = reactiveProps<{ size: 'sm' | 'md'; color: string }>({
      size,
      color: () => 'primary',
    });
    const [picked] = splitProps(source, ['size']);
    const seen: string[] = [];
    const dispose = effect(() => { seen.push(picked.size); });
    flushSync();
    expect(seen).toEqual(['md']);
    setSize('sm');
    flushSync();
    expect(seen).toEqual(['md', 'sm']);
    dispose();
  });

  it('omits keys from `rest` even when listed in `keys`', () => {
    const source = { a: 1, b: 2 };
    const [, rest] = splitProps(source, ['a']);
    expect('a' in rest).toBe(false);
    expect(rest.b).toBe(2);
  });

  it('does not define descriptors for keys not present on source', () => {
    // Critical for mergeProps composition: missing keys must not
    // appear on `picked` as undefined slots, or a later
    // `mergeProps(defaults, picked)` would see them and override.
    const source = { a: 1 } as { a: number; b?: number };
    const [picked] = splitProps(source, ['b']);
    expect('b' in picked).toBe(false);
    const merged = mergeProps({ b: 99 }, picked);
    expect(merged.b).toBe(99);
  });

  it('composes with mergeProps: forward-and-merge round-trip', () => {
    const [size, setSize] = signal<'sm' | 'md'>('md');
    const source = reactiveProps<{ size: 'sm' | 'md'; variant: string; extra: boolean }>({
      size,
      variant: () => 'filled',
      extra: () => true,
    });
    const [local, rest] = splitProps(source, ['extra']);
    const merged = mergeProps({ variant: 'outline' }, rest);
    // rest came later - its getter wins.
    expect(merged.variant).toBe('filled');
    expect(merged.size).toBe('md');
    expect(local.extra).toBe(true);
    setSize('sm');
    expect(merged.size).toBe('sm');
  });
});
