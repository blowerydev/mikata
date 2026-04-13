import { describe, it, expect } from 'vitest';
import { signal, flushSync, effect, createScope } from '@mikata/reactivity';
import { createFormatters } from '../src/formatters';

describe('formatters', () => {
  it('formats numbers', () => {
    const [locale] = signal('en-US');
    const fmt = createFormatters(locale);
    expect(fmt.number(1234.5)).toBe('1,234.5');
  });

  it('formats numbers with options', () => {
    const [locale] = signal('en-US');
    const fmt = createFormatters(locale);
    const result = fmt.number(1234.5, { style: 'currency', currency: 'USD' });
    expect(result).toBe('$1,234.50');
  });

  it('formats dates', () => {
    const [locale] = signal('en-US');
    const fmt = createFormatters(locale);
    const date = new Date(2026, 3, 11); // April 11, 2026
    const result = fmt.date(date, { year: 'numeric', month: 'long', day: 'numeric' });
    expect(result).toBe('April 11, 2026');
  });

  it('formats relative time', () => {
    const [locale] = signal('en-US');
    const fmt = createFormatters(locale);
    const result = fmt.relativeTime(-3, 'day');
    expect(result).toBe('3 days ago');
  });

  it('formats lists', () => {
    const [locale] = signal('en-US');
    const fmt = createFormatters(locale);
    const result = fmt.list(['Alice', 'Bob', 'Charlie'], { type: 'conjunction' });
    expect(result).toBe('Alice, Bob, and Charlie');
  });

  it('reacts to locale changes', () => {
    const [locale, setLocale] = signal('en-US');
    const fmt = createFormatters(locale);
    const values: string[] = [];

    const scope = createScope(() => {
      effect(() => {
        values.push(fmt.number(1234.5));
      });
    });

    flushSync();
    expect(values).toEqual(['1,234.5']);

    setLocale('de-DE');
    flushSync();
    expect(values.length).toBe(2);
    expect(values[1]).toBe('1.234,5');

    scope.dispose();
  });

  it('caches formatter instances', () => {
    const [locale] = signal('en-US');
    const fmt = createFormatters(locale);

    // Call twice with same options - should use cache (no error, consistent results)
    const a = fmt.number(100, { style: 'percent' });
    const b = fmt.number(100, { style: 'percent' });
    expect(a).toBe(b);
  });
});
