import { describe, it, expect, beforeEach } from 'vitest';
import { mergeClasses } from '../src/utils/class-merge';
import { useId, _resetIdCounter } from '../src/utils/use-id';
import { useDisclosure } from '../src/utils/use-disclosure';

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

describe('useId', () => {
  beforeEach(() => {
    _resetIdCounter();
  });

  it('generates unique IDs with default prefix', () => {
    const id1 = useId();
    const id2 = useId();
    expect(id1).toBe('mkt-1');
    expect(id2).toBe('mkt-2');
    expect(id1).not.toBe(id2);
  });

  it('uses custom prefix', () => {
    const id = useId('btn');
    expect(id).toBe('btn-1');
  });

  it('increments counter across different prefixes', () => {
    const id1 = useId('a');
    const id2 = useId('b');
    expect(id1).toBe('a-1');
    expect(id2).toBe('b-2');
  });
});

describe('useDisclosure', () => {
  it('starts closed by default', () => {
    const { opened } = useDisclosure();
    expect(opened()).toBe(false);
  });

  it('accepts initial state', () => {
    const { opened } = useDisclosure(true);
    expect(opened()).toBe(true);
  });

  it('open() sets state to true', () => {
    const { opened, open } = useDisclosure();
    open();
    expect(opened()).toBe(true);
  });

  it('close() sets state to false', () => {
    const { opened, close } = useDisclosure(true);
    close();
    expect(opened()).toBe(false);
  });

  it('toggle() flips state', () => {
    const { opened, toggle } = useDisclosure();
    toggle();
    expect(opened()).toBe(true);
    toggle();
    expect(opened()).toBe(false);
  });
});
