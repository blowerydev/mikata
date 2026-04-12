import { describe, it, expect, vi } from 'vitest';
import { signal, computed, effect, flushSync, createScope } from '@mikata/reactivity';
import { createI18n } from '../src/core';
import { resolveKey, interpolate } from '../src/translate';
import { resolvePlural } from '../src/plural';

// ─── resolveKey ──────────────────────────────────────

describe('resolveKey', () => {
  const messages = {
    greeting: 'Hello',
    nav: { home: 'Home', about: 'About Us' },
    deep: { level1: { level2: { value: 'Deep Value' } } },
    items: { one: '{{count}} item', other: '{{count}} items' },
  };

  it('resolves flat keys', () => {
    expect(resolveKey(messages, 'greeting')).toBe('Hello');
  });

  it('resolves dot-path keys', () => {
    expect(resolveKey(messages, 'nav.home')).toBe('Home');
    expect(resolveKey(messages, 'nav.about')).toBe('About Us');
  });

  it('resolves deeply nested keys', () => {
    expect(resolveKey(messages, 'deep.level1.level2.value')).toBe('Deep Value');
  });

  it('returns object for intermediate keys', () => {
    const result = resolveKey(messages, 'nav');
    expect(result).toEqual({ home: 'Home', about: 'About Us' });
  });

  it('returns undefined for missing keys', () => {
    expect(resolveKey(messages, 'missing')).toBeUndefined();
    expect(resolveKey(messages, 'nav.missing')).toBeUndefined();
    expect(resolveKey(messages, 'a.b.c.d')).toBeUndefined();
  });

  it('returns object for plural keys', () => {
    const result = resolveKey(messages, 'items');
    expect(result).toEqual({ one: '{{count}} item', other: '{{count}} items' });
  });
});

// ─── interpolate ─────────────────────────────────────

describe('interpolate', () => {
  it('replaces single param', () => {
    expect(interpolate('Hello {{name}}', { name: 'World' })).toBe('Hello World');
  });

  it('replaces multiple params', () => {
    expect(interpolate('{{greeting}} {{name}}!', { greeting: 'Hi', name: 'Bob' }))
      .toBe('Hi Bob!');
  });

  it('replaces numeric params', () => {
    expect(interpolate('Page {{page}} of {{total}}', { page: 3, total: 10 }))
      .toBe('Page 3 of 10');
  });

  it('leaves unmatched placeholders intact', () => {
    expect(interpolate('Hello {{name}}', {})).toBe('Hello {{name}}');
  });

  it('handles no placeholders', () => {
    expect(interpolate('No params here', { name: 'Bob' })).toBe('No params here');
  });
});

// ─── resolvePlural ───────────────────────────────────

describe('resolvePlural', () => {
  const messages = {
    items: { one: '{{count}} item', other: '{{count}} items' },
    apples: { zero: 'No apples', one: '{{count}} apple', other: '{{count}} apples' },
  };

  it('selects "one" for count 1', () => {
    expect(resolvePlural('en', messages, 'items', 1)).toBe('1 item');
  });

  it('selects "other" for count 0', () => {
    expect(resolvePlural('en', messages, 'items', 0)).toBe('0 items');
  });

  it('selects "other" for count > 1', () => {
    expect(resolvePlural('en', messages, 'items', 5)).toBe('5 items');
  });

  it('uses zero category when available and locale supports it', () => {
    // English PluralRules maps 0 to "other", not "zero"
    // But Arabic or other languages may use "zero"
    expect(resolvePlural('en', messages, 'apples', 0)).toBe('0 apples');
  });

  it('passes extra params through', () => {
    const msgs = { greeting: { one: '{{count}} {{thing}}', other: '{{count}} {{thing}}s' } };
    expect(resolvePlural('en', msgs, 'greeting', 1, { thing: 'cat' })).toBe('1 cat');
    expect(resolvePlural('en', msgs, 'greeting', 3, { thing: 'cat' })).toBe('3 cats');
  });

  it('returns undefined for missing keys', () => {
    expect(resolvePlural('en', messages, 'missing', 1)).toBeUndefined();
  });

  it('handles string values (non-plural key)', () => {
    const msgs = { greeting: 'Hello' };
    expect(resolvePlural('en', msgs, 'greeting', 1)).toBe('Hello');
  });
});

// ─── createI18n ──────────────────────────────────────

describe('createI18n', () => {
  const en = {
    greeting: 'Hello {{name}}',
    farewell: 'Goodbye',
    nav: { home: 'Home', about: 'About' },
    items: { one: '{{count}} item', other: '{{count}} items' },
  };

  const fr = {
    greeting: 'Bonjour {{name}}',
    farewell: 'Au revoir',
    nav: { home: 'Accueil', about: 'À propos' },
    items: { one: '{{count}} article', other: '{{count}} articles' },
  };

  it('creates instance with correct initial locale', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    expect(i18n.locale()).toBe('en');
    expect(i18n.loading()).toBe(false);
  });

  it('translates flat keys', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    expect(i18n.t('farewell' as any)).toBe('Goodbye');
  });

  it('translates nested keys', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    expect(i18n.t('nav.home' as any)).toBe('Home');
  });

  it('interpolates params', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    expect(i18n.t('greeting' as any, { name: 'World' })).toBe('Hello World');
  });

  it('falls back to fallback locale for missing keys', () => {
    const partial = { greeting: 'Hola {{name}}' };
    const i18n = createI18n({
      locale: 'es',
      fallbackLocale: 'en',
      messages: { en, es: partial as any },
    });
    // 'farewell' missing in es, falls back to en
    expect(i18n.t('farewell' as any)).toBe('Goodbye');
  });

  it('returns raw key for completely missing keys', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    expect(i18n.t('nonexistent' as any)).toBe('nonexistent');
  });

  it('calls onMissingKey handler', () => {
    const handler = vi.fn(() => 'MISSING');
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
      onMissingKey: handler,
    });
    expect(i18n.t('nonexistent' as any)).toBe('MISSING');
    expect(handler).toHaveBeenCalledWith('nonexistent', 'en');
  });

  it('t.plural() resolves plural forms', () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    expect(i18n.t.plural('items' as any, 1)).toBe('1 item');
    expect(i18n.t.plural('items' as any, 5)).toBe('5 items');
  });

  // ─── Locale switching ─────────────────────────────

  it('switches locale with pre-loaded messages', async () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en, fr } });
    expect(i18n.t('farewell' as any)).toBe('Goodbye');

    await i18n.setLocale('fr');
    expect(i18n.locale()).toBe('fr');
    expect(i18n.t('farewell' as any)).toBe('Au revoir');
  });

  it('switches locale with async loader', async () => {
    const loader = vi.fn(async (locale: string) => {
      if (locale === 'fr') return fr;
      throw new Error(`Unknown locale: ${locale}`);
    });

    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
      loader,
    });

    await i18n.setLocale('fr');
    expect(loader).toHaveBeenCalledWith('fr');
    expect(i18n.locale()).toBe('fr');
    expect(i18n.t('greeting' as any, { name: 'Monde' })).toBe('Bonjour Monde');
  });

  it('sets loading signal during async load', async () => {
    let resolveLoader!: (value: any) => void;
    const loader = vi.fn(() => new Promise<any>((resolve) => { resolveLoader = resolve; }));

    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
      loader,
    });

    expect(i18n.loading()).toBe(false);

    const promise = i18n.setLocale('fr');
    expect(i18n.loading()).toBe(true);

    resolveLoader(fr);
    await promise;
    expect(i18n.loading()).toBe(false);
  });

  it('caches loaded locales (does not re-fetch)', async () => {
    const loader = vi.fn(async () => fr);
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
      loader,
    });

    await i18n.setLocale('fr');
    await i18n.setLocale('en');
    await i18n.setLocale('fr'); // should use cache
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('throws when no loader and locale not pre-loaded', async () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en } });
    await expect(i18n.setLocale('fr')).rejects.toThrow('No translations for locale "fr"');
  });

  it('no-ops when setting same locale', async () => {
    const loader = vi.fn(async () => fr);
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
      loader,
    });

    await i18n.setLocale('en');
    expect(loader).not.toHaveBeenCalled();
  });

  // ─── Reactivity ────────────────────────────────────

  it('re-runs effects when locale changes', async () => {
    const i18n = createI18n({ locale: 'en', fallbackLocale: 'en', messages: { en, fr } });
    const values: string[] = [];

    const scope = createScope(() => {
      effect(() => {
        values.push(i18n.t('farewell' as any));
      });
    });

    flushSync();
    expect(values).toEqual(['Goodbye']);

    await i18n.setLocale('fr');
    flushSync();
    expect(values).toEqual(['Goodbye', 'Au revoir']);

    scope.dispose();
  });

  it('resets loading on loader error', async () => {
    const loader = vi.fn(async () => { throw new Error('Network error'); });
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en },
      loader,
    });

    await expect(i18n.setLocale('fr')).rejects.toThrow('Network error');
    expect(i18n.loading()).toBe(false);
    // Locale should not have changed
    expect(i18n.locale()).toBe('en');
  });
});
