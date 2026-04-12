import { describe, it, expect, vi } from 'vitest';
import { getPath } from '../src/utils/get-path';
import { setPath } from '../src/utils/set-path';
import { deepEqual } from '../src/utils/deep-equal';
import { deepClone } from '../src/utils/deep-clone';

describe('getPath', () => {
  it('returns the whole object for empty path', () => {
    const o = { a: 1 };
    expect(getPath(o, '')).toBe(o);
  });
  it('reads nested values', () => {
    expect(getPath({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
  });
  it('reads through array indices', () => {
    expect(getPath({ items: [{ name: 'x' }, { name: 'y' }] }, 'items.1.name')).toBe('y');
  });
  it('returns undefined on missing segments', () => {
    expect(getPath({ a: {} }, 'a.b.c')).toBe(undefined);
  });
});

describe('setPath', () => {
  it('sets nested values immutably', () => {
    const o = { a: { b: 1 } };
    const n = setPath(o, 'a.b', 2);
    expect(n).not.toBe(o);
    expect(n.a).not.toBe(o.a);
    expect(n.a.b).toBe(2);
    expect(o.a.b).toBe(1);
  });
  it('handles array indices', () => {
    const o = { items: [{ name: 'x' }] };
    const n = setPath(o, 'items.0.name', 'y');
    expect(n.items[0].name).toBe('y');
    expect(o.items[0].name).toBe('x');
  });
  it('creates intermediate containers when missing', () => {
    const n = setPath<Record<string, unknown>>({}, 'a.b.c', 1);
    expect(n).toEqual({ a: { b: { c: 1 } } });
  });
  it('creates array containers for numeric next keys', () => {
    const n = setPath<Record<string, unknown>>({}, 'items.0', 'x');
    expect(Array.isArray(n.items)).toBe(true);
  });
});

describe('deepEqual', () => {
  it('handles primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual(NaN, NaN)).toBe(true);
  });
  it('handles arrays and nested objects', () => {
    expect(deepEqual([1, 2, { a: 1 }], [1, 2, { a: 1 }])).toBe(true);
    expect(deepEqual([1, 2, { a: 1 }], [1, 2, { a: 2 }])).toBe(false);
  });
  it('rejects object vs array', () => {
    expect(deepEqual({ 0: 1 }, [1])).toBe(false);
  });
});

describe('deepClone', () => {
  it('returns a new object with equal shape', () => {
    const o = { a: { b: [1, 2] } };
    const c = deepClone(o);
    expect(c).not.toBe(o);
    expect(c.a).not.toBe(o.a);
    expect(c.a.b).not.toBe(o.a.b);
    expect(c).toEqual(o);
  });

  it('clones Date values instead of sharing reference', () => {
    const d = new Date(2025, 0, 1);
    const c = deepClone({ d });
    expect(c.d).not.toBe(d);
    expect(c.d.getTime()).toBe(d.getTime());
  });

  it('warns in dev when a non-plain object is encountered', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class Foo { x = 1; }
    deepClone({ foo: new Foo() });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
