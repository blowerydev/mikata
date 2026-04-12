import type { ReadSignal } from '@mikata/reactivity';

declare const __DEV__: boolean;

// --- Recursive dot-path key extraction ---

type Prev = [never, 0, 1, 2, 3];

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'extends' extends '' ? '' : '.'}${P}`
    : never
  : never;

/**
 * Extract all dot-path keys from a nested object type.
 * Limits recursion depth to 4 levels.
 *
 * Example:
 *   { nav: { home: 'Home', about: 'About' }, greeting: 'Hi' }
 *   → 'nav' | 'nav.home' | 'nav.about' | 'greeting'
 */
export type TranslationKeys<T, D extends number = 4> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
          ? T[K] extends Record<string, unknown>
            ? `${K}` | `${K}.${TranslationKeys<T[K], Prev[D]>}`
            : `${K}`
          : never;
      }[keyof T]
    : '';

// --- Plural categories ---

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
export type PluralMessages = Partial<Record<PluralCategory, string>>;

// --- Options ---

export interface I18nOptions<T extends Record<string, unknown>> {
  /** Initial locale */
  locale: string;
  /** Locale to fall back to when a key is missing */
  fallbackLocale: string;
  /** Pre-loaded translation dictionaries keyed by locale */
  messages: Record<string, T>;
  /** Async loader for fetching locale data at runtime (CDN, API, etc.) */
  loader?: (locale: string) => Promise<T>;
  /** Called when a key is missing. Return a string to use as fallback. */
  onMissingKey?: (key: string, locale: string) => string | void;
}

// --- Translate function ---

export interface TranslateFunction<T extends Record<string, unknown>> {
  (key: TranslationKeys<T>, params?: Record<string, string | number>): string;
  plural: (key: TranslationKeys<T>, count: number, params?: Record<string, string | number>) => string;
  /** Returns a reactive Text node that updates when the locale changes. */
  node: (key: TranslationKeys<T>, params?: Record<string, string | number>) => Text;
}

// --- Formatters ---

export interface Formatters {
  number(value: number, options?: Intl.NumberFormatOptions): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
  list(values: string[], options?: Intl.ListFormatOptions): string;
}

// --- I18n instance ---

export interface I18nInstance<T extends Record<string, unknown>> {
  /** Reactive getter for the current locale */
  locale: ReadSignal<string>;
  /** Switch locale — loads translations via loader if needed */
  setLocale: (locale: string) => Promise<void>;
  /** Reactive getter for loading state (true while fetching translations) */
  loading: ReadSignal<boolean>;
  /** Translation function */
  t: TranslateFunction<T>;
  /** Intl-based formatters */
  fmt: Formatters;
}
