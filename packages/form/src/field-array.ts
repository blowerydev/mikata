import type { MikataForm, FieldArrayHandle, FieldArrayEntry } from './types';
import { getPath } from './utils/get-path';

let counter = 0;
const makeKey = (): string => `fa_${++counter}`;

/**
 * Create a reactive field-array handle bound to a path on a form. Tracks a
 * stable key per item so each-iteration in the UI does not rebuild focused
 * inputs when items are inserted, removed, or reordered.
 *
 * Keys are regenerated if the array length changes outside of the handle's
 * mutators (e.g. `form.reset()` or `form.setFieldValue(path, newArr)`).
 */
export function createFieldArray<T = unknown, Values extends object = object>(
  form: MikataForm<Values>,
  path: string
): FieldArrayHandle<T> {
  const keys: string[] = [];

  function currentList(): T[] {
    return ((getPath(form.values as unknown as object, path) as T[] | undefined) ?? []);
  }

  function ensureKeys(len: number): void {
    if (keys.length > len) keys.length = len;
    while (keys.length < len) keys.push(makeKey());
  }

  function length(): number {
    return currentList().length;
  }

  function items(): T[] {
    return currentList();
  }

  function keysSnapshot(): string[] {
    const list = currentList();
    ensureKeys(list.length);
    return keys.slice();
  }

  function entries(): FieldArrayEntry<T>[] {
    const list = currentList();
    ensureKeys(list.length);
    const out: FieldArrayEntry<T>[] = new Array(list.length);
    for (let i = 0; i < list.length; i++) {
      out[i] = {
        key: keys[i],
        path: `${path}.${i}`,
        value: list[i],
        index: i,
      };
    }
    return out;
  }

  function append(item: T): void {
    form.insertListItem(path, item);
    keys.push(makeKey());
  }

  function prepend(item: T): void {
    form.insertListItem(path, item, 0);
    keys.unshift(makeKey());
  }

  function insert(index: number, item: T): void {
    const len = currentList().length;
    const i = Math.max(0, Math.min(index, len));
    form.insertListItem(path, item, i);
    // Ensure we have keys up to at least the old length before splicing in the new one.
    ensureKeys(len);
    keys.splice(i, 0, makeKey());
  }

  function remove(index: number): void {
    const len = currentList().length;
    if (index < 0 || index >= len) return;
    form.removeListItem(path, index);
    ensureKeys(len);
    keys.splice(index, 1);
  }

  function move(from: number, to: number): void {
    const len = currentList().length;
    if (from === to) return;
    if (from < 0 || from >= len || to < 0 || to >= len) return;
    form.reorderListItem(path, { from, to });
    ensureKeys(len);
    const [k] = keys.splice(from, 1);
    keys.splice(to, 0, k);
  }

  function swap(a: number, b: number): void {
    if (a === b) return;
    const list = currentList().slice();
    if (a < 0 || a >= list.length || b < 0 || b >= list.length) return;
    const tmp = list[a];
    list[a] = list[b];
    list[b] = tmp;
    form.setFieldValue(path, list);
    ensureKeys(list.length);
    const kt = keys[a];
    keys[a] = keys[b];
    keys[b] = kt;
  }

  function replace(index: number, item: T): void {
    form.replaceListItem(path, index, item);
    ensureKeys(currentList().length);
    if (index >= 0 && index < keys.length) keys[index] = makeKey();
  }

  function clear(): void {
    form.setFieldValue(path, []);
    keys.length = 0;
  }

  return {
    path,
    length,
    items,
    keys: keysSnapshot,
    entries,
    append,
    prepend,
    insert,
    remove,
    move,
    swap,
    replace,
    clear,
  };
}
