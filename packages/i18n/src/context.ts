import { createContext, provide, inject } from '@mikata/runtime';
import type { I18nInstance } from './types';

const I18nContext = createContext<I18nInstance<any>>();

/**
 * Provide an i18n instance to descendant components.
 * Call in your root component setup.
 *
 * Usage:
 *   provideI18n(i18n);
 */
export function provideI18n<T extends Record<string, unknown>>(
  instance: I18nInstance<T>
): void {
  provide(I18nContext, instance);
}

/**
 * Inject the i18n instance from the nearest ancestor provider.
 *
 * Usage:
 *   const { t, fmt, locale, setLocale } = useI18n();
 */
export function useI18n<T extends Record<string, unknown>>(): I18nInstance<T> {
  return inject(I18nContext) as I18nInstance<T>;
}
