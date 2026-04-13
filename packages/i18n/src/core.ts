import { signal, computed, effect } from '@mikata/reactivity';
import type { I18nOptions, I18nInstance, TranslateFunction } from './types';
import { createTranslateFunction } from './translate';
import { createPluralFunction } from './plural';
import { createFormatters } from './formatters';

declare const __DEV__: boolean;

/**
 * Create an i18n instance with reactive locale and translation support.
 *
 * Usage:
 *   const i18n = createI18n({
 *     locale: 'en',
 *     fallbackLocale: 'en',
 *     messages: { en: { greeting: 'Hello {{name}}' } },
 *     loader: async (locale) => fetch(`/i18n/${locale}.json`).then(r => r.json()),
 *   });
 */
export function createI18n<T extends Record<string, unknown>>(
  options: I18nOptions<T>
): I18nInstance<T> {
  const [locale, setLocaleRaw] = signal(options.locale);
  const [loading, setLoading] = signal(false);

  // Cache of loaded translation dictionaries
  const messagesCache = new Map<string, T>();
  for (const [loc, msgs] of Object.entries(options.messages)) {
    messagesCache.set(loc, msgs);
  }

  // Computed: current locale's messages (reactive dependency on locale signal)
  const currentMessages = computed(() => {
    const loc = locale();
    return messagesCache.get(loc) ?? messagesCache.get(options.fallbackLocale)!;
  });

  // Fallback messages (non-reactive, just a lookup)
  const getFallbackMessages = () =>
    messagesCache.get(options.fallbackLocale);

  /**
   * Switch locale. If the locale isn't cached, loads it via the loader.
   * The locale signal updates only after loading completes.
   */
  async function setLocale(newLocale: string): Promise<void> {
    if (newLocale === locale()) return;

    if (!messagesCache.has(newLocale)) {
      if (!options.loader) {
        throw new Error(
          `[mikata/i18n] No translations for locale "${newLocale}" and no loader configured.`
        );
      }
      setLoading(true);
      try {
        const msgs = await options.loader(newLocale);
        messagesCache.set(newLocale, msgs);
      } finally {
        setLoading(false);
      }
    }

    setLocaleRaw(newLocale);
  }

  // Build t() with .plural attached
  const baseFn = createTranslateFunction<T>(
    currentMessages,
    getFallbackMessages,
    locale,
    options.onMissingKey,
    options.formatter
  );

  const t = baseFn as unknown as TranslateFunction<T>;

  t.plural = createPluralFunction<T>(
    currentMessages,
    getFallbackMessages,
    locale,
    options.onMissingKey,
    options.formatter
  );

  t.node = (key: string, params?: Record<string, unknown>): Text => {
    const node = document.createTextNode('');
    effect(() => {
      node.textContent = baseFn(key, params);
    });
    return node;
  };

  // Build formatters
  const fmt = createFormatters(locale);

  return {
    locale,
    setLocale,
    loading,
    t,
    fmt,
  };
}
