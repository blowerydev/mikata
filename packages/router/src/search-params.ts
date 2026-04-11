/**
 * Typed search parameter parsing and serialization.
 *
 * Schemas are declared on route definitions, and the router uses them
 * to automatically parse URL query strings into typed values and
 * serialize updates back to strings.
 */

import type { SearchParamDef } from './types';

// ---------------------------------------------------------------------------
// Search Param Builders
// ---------------------------------------------------------------------------

export const searchParam = {
  /**
   * String search param.
   * @param defaultValue - value when param is missing (default: '')
   */
  string(defaultValue = ''): SearchParamDef<string> {
    return {
      parse: (raw: string | null) => raw ?? defaultValue,
      serialize: String,
      defaultValue,
    };
  },

  /**
   * Number search param.
   * @param defaultValue - value when param is missing or NaN (default: 0)
   */
  number(defaultValue = 0): SearchParamDef<number> {
    return {
      parse: (raw: string | null) => {
        if (raw == null) return defaultValue;
        const n = Number(raw);
        return Number.isNaN(n) ? defaultValue : n;
      },
      serialize: String,
      defaultValue,
    };
  },

  /**
   * Boolean search param.
   * @param defaultValue - value when param is missing (default: false)
   */
  boolean(defaultValue = false): SearchParamDef<boolean> {
    return {
      parse: (raw: string | null) => {
        if (raw == null) return defaultValue;
        if (raw === 'true' || raw === '1') return true;
        if (raw === 'false' || raw === '0') return false;
        return defaultValue;
      },
      serialize: String,
      defaultValue,
    };
  },

  /**
   * JSON-encoded search param for complex values.
   * @param defaultValue - value when param is missing or parse fails
   */
  json<T>(defaultValue: T): SearchParamDef<T> {
    return {
      parse: (raw: string | null) => {
        if (raw == null) return defaultValue;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return defaultValue;
        }
      },
      serialize: (v: T) => JSON.stringify(v),
      defaultValue,
    };
  },

  /**
   * Enum search param — validates against allowed values.
   * @param values - array of allowed values
   * @param defaultValue - value when param is missing or invalid
   */
  enum<T extends string>(values: readonly T[], defaultValue: T): SearchParamDef<T> {
    return {
      parse: (raw: string | null) =>
        raw != null && (values as readonly string[]).includes(raw)
          ? (raw as T)
          : defaultValue,
      serialize: String,
      defaultValue,
    };
  },
};

// ---------------------------------------------------------------------------
// Parse/Serialize
// ---------------------------------------------------------------------------

/**
 * Parse a URL search string using the route's search schema.
 * Returns an object with all schema keys populated (using defaults for missing params).
 */
export function parseSearchParams(
  searchString: string,
  schema: Record<string, SearchParamDef> | undefined
): Record<string, unknown> {
  if (!schema) return {};

  const url = new URLSearchParams(searchString);
  const result: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(schema)) {
    result[key] = def.parse(url.get(key));
  }

  return result;
}

/**
 * Serialize an object of search param values back to a URL search string.
 * Only includes params that differ from their default value.
 */
export function serializeSearchParams(
  values: Record<string, unknown>,
  schema: Record<string, SearchParamDef> | undefined
): string {
  if (!schema) return '';

  const params = new URLSearchParams();

  for (const [key, def] of Object.entries(schema)) {
    const value = values[key];
    if (value !== undefined && value !== def.defaultValue) {
      params.set(key, def.serialize(value));
    }
  }

  const str = params.toString();
  return str ? `?${str}` : '';
}
