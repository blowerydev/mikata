import { describe, it, expect } from 'vitest';
import { createForm } from '../src/create-form';

describe('form.fieldArray()', () => {
  it('reads items, length, and entries reactively', () => {
    const form = createForm({
      initialValues: { tags: ['a', 'b', 'c'] as string[] },
    });
    const arr = form.fieldArray<string>('tags');

    expect(arr.path).toBe('tags');
    expect(arr.length()).toBe(3);
    expect(arr.items()).toEqual(['a', 'b', 'c']);

    const entries = arr.entries();
    expect(entries.map((e) => e.value)).toEqual(['a', 'b', 'c']);
    expect(entries.map((e) => e.path)).toEqual(['tags.0', 'tags.1', 'tags.2']);
    expect(entries.map((e) => e.index)).toEqual([0, 1, 2]);
  });

  it('assigns a stable key per index and preserves keys across reads', () => {
    const form = createForm({ initialValues: { tags: ['a', 'b'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    const first = arr.keys();
    const second = arr.keys();
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(2);
  });

  it('append adds an item and a fresh key at the end', () => {
    const form = createForm({ initialValues: { tags: ['a'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    const [k0] = arr.keys();

    arr.append('b');
    expect(arr.items()).toEqual(['a', 'b']);
    const keys = arr.keys();
    expect(keys[0]).toBe(k0);
    expect(keys[1]).not.toBe(k0);
  });

  it('prepend adds an item and a fresh key at index 0', () => {
    const form = createForm({ initialValues: { tags: ['b'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    const [kB] = arr.keys();

    arr.prepend('a');
    expect(arr.items()).toEqual(['a', 'b']);
    const keys = arr.keys();
    expect(keys[1]).toBe(kB);
  });

  it('insert places the item and key at the given index', () => {
    const form = createForm({ initialValues: { tags: ['a', 'c'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    const [kA, kC] = arr.keys();

    arr.insert(1, 'b');
    expect(arr.items()).toEqual(['a', 'b', 'c']);
    const keys = arr.keys();
    expect(keys[0]).toBe(kA);
    expect(keys[2]).toBe(kC);
    expect(keys[1]).not.toBe(kA);
    expect(keys[1]).not.toBe(kC);
  });

  it('remove drops the item and its key, preserving others', () => {
    const form = createForm({ initialValues: { tags: ['a', 'b', 'c'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    const [kA, , kC] = arr.keys();

    arr.remove(1);
    expect(arr.items()).toEqual(['a', 'c']);
    expect(arr.keys()).toEqual([kA, kC]);
  });

  it('move reorders items and carries the key with the item', () => {
    const form = createForm({ initialValues: { tags: ['a', 'b', 'c'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    const [kA, kB, kC] = arr.keys();

    arr.move(0, 2);
    expect(arr.items()).toEqual(['b', 'c', 'a']);
    expect(arr.keys()).toEqual([kB, kC, kA]);
  });

  it('swap exchanges items and keys at the two indices', () => {
    const form = createForm({ initialValues: { tags: ['a', 'b', 'c'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    const [kA, kB, kC] = arr.keys();

    arr.swap(0, 2);
    expect(arr.items()).toEqual(['c', 'b', 'a']);
    expect(arr.keys()).toEqual([kC, kB, kA]);
  });

  it('replace swaps the item and emits a new key at that index', () => {
    const form = createForm({ initialValues: { tags: ['a', 'b'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    const [kA, kB] = arr.keys();

    arr.replace(0, 'A!');
    expect(arr.items()).toEqual(['A!', 'b']);
    const keys = arr.keys();
    expect(keys[0]).not.toBe(kA);
    expect(keys[1]).toBe(kB);
  });

  it('clear empties the array and drops every key', () => {
    const form = createForm({ initialValues: { tags: ['a', 'b', 'c'] as string[] } });
    const arr = form.fieldArray<string>('tags');

    arr.clear();
    expect(arr.items()).toEqual([]);
    expect(arr.keys()).toEqual([]);
    expect(arr.length()).toBe(0);
  });

  it('reconciles keys when the array changes outside the handle (e.g. setFieldValue)', () => {
    const form = createForm({ initialValues: { tags: ['a', 'b'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    expect(arr.keys().length).toBe(2);

    form.setFieldValue('tags', ['x', 'y', 'z']);
    expect(arr.items()).toEqual(['x', 'y', 'z']);
    expect(arr.keys().length).toBe(3);
  });

  it('reconciles keys after form.reset()', () => {
    const form = createForm({ initialValues: { tags: ['a'] as string[] } });
    const arr = form.fieldArray<string>('tags');
    arr.append('b');
    arr.append('c');
    expect(arr.length()).toBe(3);

    form.reset();
    expect(arr.items()).toEqual(['a']);
    expect(arr.keys().length).toBe(1);
  });

  it('works with arrays of objects', () => {
    const form = createForm({
      initialValues: {
        people: [{ name: 'A', age: 1 }, { name: 'B', age: 2 }],
      },
    });
    const arr = form.fieldArray<{ name: string; age: number }>('people');

    arr.append({ name: 'C', age: 3 });
    expect(arr.items().map((p) => p.name)).toEqual(['A', 'B', 'C']);
    expect(arr.entries()[2].path).toBe('people.2');

    // Bind an input through the per-item path
    const nameProps = form.getInputProps('people.2.name');
    nameProps.onChange({ target: { value: 'C!' } });
    expect(form.getValue('people.2.name')).toBe('C!');
  });

  it('removes errors for the removed index and shifts later ones down', () => {
    const form = createForm({
      initialValues: { items: [{ n: 1 }, { n: 2 }, { n: 3 }] },
    });
    form.setErrors({
      'items.0.n': 'zero',
      'items.1.n': 'one',
      'items.2.n': 'two',
    });
    const arr = form.fieldArray<{ n: number }>('items');
    arr.remove(1);

    expect(form.errors['items.0.n']).toBe('zero');
    expect(form.errors['items.1.n']).toBe('two');
    expect(form.errors['items.2.n']).toBeUndefined();
  });

  it('works through a form scope', () => {
    const form = createForm({
      initialValues: { user: { hobbies: ['read'] as string[] } },
    });
    const user = form.scope('user');
    const arr = user.fieldArray<string>('hobbies');

    expect(arr.path).toBe('user.hobbies');
    arr.append('code');
    expect(form.getValue('user.hobbies')).toEqual(['read', 'code']);
    expect(arr.entries()[1].path).toBe('user.hobbies.1');
  });

  it('entries() re-runs inside an effect when the array changes', async () => {
    const { createScope, effect, flushSync } = await import('@mikata/reactivity');
    const form = createForm({ initialValues: { tags: ['a'] as string[] } });
    const arr = form.fieldArray<string>('tags');

    const seen: number[] = [];
    const scope = createScope(() => {
      effect(() => {
        seen.push(arr.entries().length);
      });
    });
    flushSync();
    arr.append('b');
    flushSync();
    arr.append('c');
    flushSync();

    expect(seen).toEqual([1, 2, 3]);
    scope.dispose();
  });
});
