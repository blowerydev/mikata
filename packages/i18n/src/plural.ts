import { interpolate, resolveKey } from './translate';
import type { PluralCategory } from './types';

declare const __DEV__: boolean;

// Cache PluralRules instances per locale
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralRules(locale: string): Intl.PluralRules {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRulesCache.set(locale, rules);
  }
  return rules;
}

/**
 * Resolve a plural translation.
 *
 * Expects the key to point to an object with plural category keys:
 *   { one: '{{count}} item', other: '{{count}} items' }
 *
 * Uses Intl.PluralRules to determine the category for the given count.
 * Auto-injects {{count}} into params.
 */
export function resolvePlural(
  locale: string,
  messages: Record<string, unknown>,
  key: string,
  count: number,
  extraParams?: Record<string, string | number>
): string | undefined {
  const value = resolveKey(messages, key);

  if (value == null) return undefined;

  // If it's a string, just interpolate with count
  if (typeof value === 'string') {
    return interpolate(value, { count, ...extraParams });
  }

  // Must be an object with plural categories
  if (typeof value !== 'object') return undefined;

  const pluralObj = value as Record<string, unknown>;
  const category = getPluralRules(locale).select(count) as PluralCategory;

  // Try exact category, then fall back to 'other'
  const template =
    (pluralObj[category] as string | undefined) ??
    (pluralObj['other'] as string | undefined);

  if (template == null) {
    if (__DEV__) {
      console.warn(
        `[mikata/i18n] Plural key "${key}" is missing category "${category}" and "other" fallback.`
      );
    }
    return key;
  }

  return interpolate(template, { count, ...extraParams });
}

/**
 * Create the t.plural() method.
 */
export function createPluralFunction<T extends Record<string, unknown>>(
  getCurrentMessages: () => T,
  getFallbackMessages: () => T | undefined,
  getLocale: () => string,
  onMissingKey?: (key: string, locale: string) => string | void
) {
  return function plural(
    key: string,
    count: number,
    params?: Record<string, string | number>
  ): string {
    const locale = getLocale();
    const messages = getCurrentMessages();

    let result = resolvePlural(locale, messages, key, count, params);

    if (result === undefined) {
      const fallback = getFallbackMessages();
      if (fallback) {
        result = resolvePlural(locale, fallback, key, count, params);
      }
    }

    if (result === undefined) {
      if (onMissingKey) {
        const custom = onMissingKey(key, locale);
        if (typeof custom === 'string') return custom;
      }
      if (__DEV__) {
        console.warn(`[mikata/i18n] Missing plural key: "${key}" for locale "${locale}"`);
      }
      return key;
    }

    return result;
  };
}
