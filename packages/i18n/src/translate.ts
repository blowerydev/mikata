import { formatIcu, looksLikeIcu } from './icu';

declare const __DEV__: boolean;

/**
 * Resolve a dot-path key on a nested object.
 * Returns the value at that path, or undefined if not found.
 */
export function resolveKey(
  obj: Record<string, unknown>,
  path: string
): string | Record<string, unknown> | undefined {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current === 'string') return current;
  if (current != null && typeof current === 'object') return current as Record<string, unknown>;
  return undefined;
}

/**
 * Replace {{param}} placeholders with values from the params object.
 * Legacy syntax — coexists with ICU `{param}`. Kept exported for callers
 * that want interpolation without ICU parsing.
 */
export function interpolate(
  template: string,
  params: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    params[key] != null ? String(params[key]) : `{{${key}}}`
  );
}

/**
 * Full formatter — runs legacy `{{param}}` interpolation, then ICU if the
 * result contains any ICU tag (`,plural`/`,select`/`,number`/`,date`/
 * `,time`). A locale is required for ICU; callers can pass a custom
 * `icuFormatter` (e.g. a full-grammar formatter from `@mikata/i18n/icu`)
 * to replace the default subset.
 */
export function formatMessage(
  template: string,
  params: Record<string, unknown> | undefined,
  locale: string,
  icuFormatter: (msg: string, params: Record<string, unknown>, locale: string) => string = formatIcu
): string {
  const p = params ?? {};
  let out = template.indexOf('{{') >= 0 ? interpolate(template, p) : template;
  if (looksLikeIcu(out)) out = icuFormatter(out, p, locale);
  return out;
}

/**
 * Create the t() function that resolves keys against the current messages.
 *
 * - `getCurrentMessages` returns the messages for the active locale (reactive — reads locale signal)
 * - `getFallbackMessages` returns fallback locale messages
 * - `getLocale` returns the current locale string (reactive)
 */
export function createTranslateFunction<T extends Record<string, unknown>>(
  getCurrentMessages: () => T,
  getFallbackMessages: () => T | undefined,
  getLocale: () => string,
  onMissingKey?: (key: string, locale: string) => string | void,
  icuFormatter?: (msg: string, params: Record<string, unknown>, locale: string) => string
) {
  function t(key: string, params?: Record<string, unknown>): string {
    // Read current messages (creates reactive dependency on locale)
    const messages = getCurrentMessages();
    let value = resolveKey(messages, key);

    // Fallback
    if (value === undefined) {
      const fallback = getFallbackMessages();
      if (fallback) {
        value = resolveKey(fallback, key);
      }
    }

    // Missing key
    if (value === undefined) {
      if (onMissingKey) {
        const result = onMissingKey(key, getLocale());
        if (typeof result === 'string') return result;
      }
      if (__DEV__) {
        console.warn(`[mikata/i18n] Missing translation key: "${key}" for locale "${getLocale()}"`);
      }
      return key;
    }

    // Value is an object (likely a plural or nested namespace) — not a string
    if (typeof value !== 'string') {
      if (__DEV__) {
        console.warn(
          `[mikata/i18n] Key "${key}" resolved to an object. Use t.plural() for plural keys, ` +
          `or access a deeper path.`
        );
      }
      return key;
    }

    return formatMessage(value, params, getLocale(), icuFormatter);
  }

  return t;
}
