import { describe, it, expect, beforeEach } from 'vitest';
import { mergeClasses } from '../src/utils/class-merge';
import { uniqueId, _resetIdCounter } from '../src/utils/unique-id';
import { createDisclosure } from '../src/utils/create-disclosure';
import { onScrollLock } from '../src/utils/on-scroll-lock';
import { createScope } from '@mikata/reactivity';

describe('mergeClasses', () => {
  it('joins multiple class names', () => {
    expect(mergeClasses('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(mergeClasses('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('returns empty string when all inputs are falsy', () => {
    expect(mergeClasses(false, null, undefined)).toBe('');
  });

  it('handles single class', () => {
    expect(mergeClasses('solo')).toBe('solo');
  });

  it('handles no arguments', () => {
    expect(mergeClasses()).toBe('');
  });
});

describe('uniqueId', () => {
  beforeEach(() => {
    _resetIdCounter();
  });

  it('generates unique IDs with default prefix', () => {
    const id1 = uniqueId();
    const id2 = uniqueId();
    expect(id1).toBe('mkt-1');
    expect(id2).toBe('mkt-2');
    expect(id1).not.toBe(id2);
  });

  it('uses custom prefix', () => {
    const id = uniqueId('btn');
    expect(id).toBe('btn-1');
  });

  it('increments counter across different prefixes', () => {
    const id1 = uniqueId('a');
    const id2 = uniqueId('b');
    expect(id1).toBe('a-1');
    expect(id2).toBe('b-2');
  });
});

describe('createDisclosure', () => {
  it('starts closed by default', () => {
    const { opened } = createDisclosure();
    expect(opened()).toBe(false);
  });

  it('accepts initial state', () => {
    const { opened } = createDisclosure(true);
    expect(opened()).toBe(true);
  });

  it('open() sets state to true', () => {
    const { opened, open } = createDisclosure();
    open();
    expect(opened()).toBe(true);
  });

  it('close() sets state to false', () => {
    const { opened, close } = createDisclosure(true);
    close();
    expect(opened()).toBe(false);
  });

  it('toggle() flips state', () => {
    const { opened, toggle } = createDisclosure();
    toggle();
    expect(opened()).toBe(true);
    toggle();
    expect(opened()).toBe(false);
  });
});

describe('onScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('restores body overflow only after the last lock is disposed', () => {
    const first = createScope(() => onScrollLock());
    const second = createScope(() => onScrollLock());

    expect(document.body.style.overflow).toBe('hidden');
    first.dispose();
    expect(document.body.style.overflow).toBe('hidden');
    second.dispose();
    expect(document.body.style.overflow).toBe('');
  });
});
