import { describe, it, expect } from 'vitest';
import { formatIcu, looksLikeIcu, parseIcu } from '../src/icu';
import { formatMessage } from '../src/translate';
import { createI18n } from '../src/core';

describe('looksLikeIcu', () => {
  it('detects ICU tags', () => {
    expect(looksLikeIcu('{n, plural, one {x} other {y}}')).toBe(true);
    expect(looksLikeIcu('hello {name, select, a {A} other {B}}')).toBe(true);
    expect(looksLikeIcu('price {amt, number, ::currency/USD}')).toBe(true);
    expect(looksLikeIcu('{d, date, short}')).toBe(true);
    expect(looksLikeIcu('{t, time, short}')).toBe(true);
  });

  it('returns false for plain messages', () => {
    expect(looksLikeIcu('Hello World')).toBe(false);
    expect(looksLikeIcu('Hello {name}')).toBe(false);
    expect(looksLikeIcu('Hello {{name}}')).toBe(false);
  });
});

describe('formatIcu - simple interpolation', () => {
  it('formats a bare arg', () => {
    expect(formatIcu('Hello {name}', { name: 'World' }, 'en')).toBe('Hello World');
  });

  it('leaves arg literal when missing', () => {
    expect(formatIcu('Hello {name}', {}, 'en')).toBe('Hello {name}');
  });
});

describe('formatIcu - plural', () => {
  const msg = '{count, plural, =0 {No items} one {# item} other {# items}}';

  it('picks exact =0 arm', () => {
    expect(formatIcu(msg, { count: 0 }, 'en')).toBe('No items');
  });

  it('picks one arm for 1', () => {
    expect(formatIcu(msg, { count: 1 }, 'en')).toBe('1 item');
  });

  it('picks other arm for >1', () => {
    expect(formatIcu(msg, { count: 5 }, 'en')).toBe('5 items');
  });

  it('locale-aware plural selection (Russian few/many)', () => {
    const ru = '{n, plural, one {# яблоко} few {# яблока} many {# яблок} other {# яблока}}';
    expect(formatIcu(ru, { n: 1 }, 'ru')).toBe('1 яблоко');
    expect(formatIcu(ru, { n: 3 }, 'ru')).toBe('3 яблока');
    expect(formatIcu(ru, { n: 5 }, 'ru')).toBe('5 яблок');
  });

  it('# is number-formatted per locale', () => {
    expect(formatIcu('{n, plural, other {# items}}', { n: 1234 }, 'en')).toBe('1,234 items');
    expect(formatIcu('{n, plural, other {# items}}', { n: 1234 }, 'de')).toBe('1.234 items');
  });

  it('# outside a plural renders literally', () => {
    expect(formatIcu('hash: #', {}, 'en')).toBe('hash: #');
  });

  it('falls back to other when category missing', () => {
    expect(formatIcu('{n, plural, other {X}}', { n: 1 }, 'en')).toBe('X');
  });
});

describe('formatIcu - select', () => {
  const msg = '{g, select, female {She} male {He} other {They}} replied';

  it('picks matching arm', () => {
    expect(formatIcu(msg, { g: 'female' }, 'en')).toBe('She replied');
    expect(formatIcu(msg, { g: 'male' }, 'en')).toBe('He replied');
  });

  it('falls back to other', () => {
    expect(formatIcu(msg, { g: 'nonbinary' }, 'en')).toBe('They replied');
  });
});

describe('formatIcu - number', () => {
  it('formats with no style', () => {
    expect(formatIcu('{n, number}', { n: 1234.5 }, 'en')).toBe('1,234.5');
  });

  it('integer style', () => {
    expect(formatIcu('{n, number, integer}', { n: 1234.7 }, 'en')).toBe('1,235');
  });

  it('percent style', () => {
    expect(formatIcu('{n, number, percent}', { n: 0.42 }, 'en')).toBe('42%');
  });

  it('currency skeleton', () => {
    const result = formatIcu('{amt, number, ::currency/USD}', { amt: 1234.5 }, 'en');
    expect(result).toContain('1,234.5');
    expect(result).toContain('$');
  });

  it('EUR skeleton', () => {
    const result = formatIcu('{amt, number, ::currency/EUR}', { amt: 10 }, 'de');
    expect(result).toContain('10');
    expect(result).toContain('€');
  });
});

describe('formatIcu - date/time', () => {
  const d = new Date(Date.UTC(2026, 3, 12, 15, 30, 0));

  it('formats date short', () => {
    const out = formatIcu('{d, date, short}', { d }, 'en-US');
    expect(out).toMatch(/\d+\/\d+\/\d+/);
  });

  it('formats time short', () => {
    const out = formatIcu('{t, time, short}', { t: d }, 'en-US');
    expect(out).toMatch(/\d+:\d+/);
  });

  it('coerces non-Date values', () => {
    const out = formatIcu('{d, date, short}', { d: d.getTime() }, 'en-US');
    expect(out).toMatch(/\d+\/\d+\/\d+/);
  });
});

describe('formatIcu - nested', () => {
  it('plural arms can contain other ICU tags', () => {
    const msg =
      '{count, plural, one {You have # {kind} item} other {You have # {kind} items}}';
    expect(formatIcu(msg, { count: 1, kind: 'cart' }, 'en')).toBe('You have 1 cart item');
    expect(formatIcu(msg, { count: 3, kind: 'cart' }, 'en')).toBe('You have 3 cart items');
  });

  it('select inside plural', () => {
    const msg =
      '{count, plural, one {# {g, select, f {reply} other {message}}} other {# {g, select, f {replies} other {messages}}}}';
    expect(formatIcu(msg, { count: 1, g: 'f' }, 'en')).toBe('1 reply');
    expect(formatIcu(msg, { count: 3, g: 'x' }, 'en')).toBe('3 messages');
  });
});

describe('parseIcu - caching', () => {
  it('returns same AST for same input', () => {
    const a = parseIcu('{n, plural, one {#} other {#}}');
    const b = parseIcu('{n, plural, one {#} other {#}}');
    expect(a).toBe(b);
  });
});

describe('formatMessage - legacy + ICU coexistence', () => {
  it('handles pure legacy {{param}}', () => {
    expect(formatMessage('Hello {{name}}', { name: 'World' }, 'en')).toBe('Hello World');
  });

  it('handles pure ICU', () => {
    expect(formatMessage('{n, plural, one {# item} other {# items}}', { n: 2 }, 'en')).toBe(
      '2 items'
    );
  });

  it('runs legacy first, then ICU', () => {
    const out = formatMessage(
      '{{prefix}} {n, plural, one {# item} other {# items}}',
      { prefix: 'You have', n: 3 },
      'en'
    );
    expect(out).toBe('You have 3 items');
  });

  it('leaves single-brace literals alone when no ICU tag', () => {
    expect(formatMessage('use {count} here', { count: 3 }, 'en')).toBe('use {count} here');
  });
});

describe('createI18n - ICU integration', () => {
  const en = {
    cart: '{count, plural, =0 {Your cart is empty} one {# item in cart} other {# items in cart}}',
    priced: 'Total: {amt, number, ::currency/USD}',
    greet: '{g, select, female {Hi Ms. {name}} male {Hi Mr. {name}} other {Hi {name}}}',
    legacy: 'Hello {{name}}',
  };

  it('t() routes through ICU', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    expect(i18n.t('cart' as any, { count: 0 })).toBe('Your cart is empty');
    expect(i18n.t('cart' as any, { count: 1 })).toBe('1 item in cart');
    expect(i18n.t('cart' as any, { count: 42 })).toBe('42 items in cart');
  });

  it('t() handles currency skeleton', () => {
    const i18n = createI18n({ locale: 'en-US', fallbackLocale: 'en', messages: { en } });
    const out = i18n.t('priced' as any, { amt: 99.5 });
    expect(out).toContain('99.5');
    expect(out).toContain('$');
  });

  it('t() handles select', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    expect(i18n.t('greet' as any, { g: 'female', name: 'Alex' })).toBe('Hi Ms. Alex');
    expect(i18n.t('greet' as any, { g: 'nb', name: 'Kim' })).toBe('Hi Kim');
  });

  it('t() keeps legacy {{param}} working', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    expect(i18n.t('legacy' as any, { name: 'World' })).toBe('Hello World');
  });

  it('custom formatter option overrides the default', () => {
    const custom = (msg: string) => `[custom: ${msg}]`;
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
      formatter: custom,
    });
    expect(i18n.t('cart' as any, { count: 1 })).toBe(
      '[custom: {count, plural, =0 {Your cart is empty} one {# item in cart} other {# items in cart}}]'
    );
  });
});
