import type { ReadSignal } from '@mikata/reactivity';
import type { Formatters } from './types';

// Cache formatter instances keyed by "type:locale:optionsJSON"
const formatterCache = new Map<string, unknown>();

function getCached<T>(key: string, factory: () => T): T {
  let instance = formatterCache.get(key) as T | undefined;
  if (!instance) {
    instance = factory();
    formatterCache.set(key, instance);
  }
  return instance;
}

function optionsKey(options: object | undefined): string {
  return options ? JSON.stringify(options) : '';
}

/**
 * Create locale-reactive Intl formatter wrappers.
 * Each method reads the locale signal, creating a reactive dependency.
 * Formatter instances are cached per locale + options combination.
 */
export function createFormatters(locale: ReadSignal<string>): Formatters {
  return {
    number(value: number, options?: Intl.NumberFormatOptions): string {
      const loc = locale();
      const key = `n:${loc}:${optionsKey(options)}`;
      const fmt = getCached(key, () => new Intl.NumberFormat(loc, options));
      return (fmt as Intl.NumberFormat).format(value);
    },

    date(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
      const loc = locale();
      const key = `d:${loc}:${optionsKey(options)}`;
      const fmt = getCached(key, () => new Intl.DateTimeFormat(loc, options));
      return (fmt as Intl.DateTimeFormat).format(value);
    },

    relativeTime(
      value: number,
      unit: Intl.RelativeTimeFormatUnit,
      options?: Intl.RelativeTimeFormatOptions
    ): string {
      const loc = locale();
      const key = `r:${loc}:${optionsKey(options)}`;
      const fmt = getCached(key, () => new Intl.RelativeTimeFormat(loc, options));
      return (fmt as Intl.RelativeTimeFormat).format(value, unit);
    },

    list(values: string[], options?: Intl.ListFormatOptions): string {
      const loc = locale();
      const key = `l:${loc}:${optionsKey(options)}`;
      const fmt = getCached(key, () => new Intl.ListFormat(loc, options));
      return (fmt as Intl.ListFormat).format(values);
    },
  };
}
