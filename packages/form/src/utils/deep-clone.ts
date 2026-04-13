declare const __DEV__: boolean;

let warnedNonPlain = false;

/**
 * Clones plain JSON-ish values plus Dates. Map/Set/class instances still pass
 * through by reference - form reset would not restore them and user mutation
 * would corrupt the pristine state. In dev, warn once when a non-plain value
 * slips in.
 */
export function deepClone<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (Array.isArray(value)) return value.map(deepClone) as unknown as T;

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    if (__DEV__ && !warnedNonPlain) {
      warnedNonPlain = true;
      console.warn(
        '[mikata/form] initialValues contain a non-plain object (Map, Set, or class instance). ' +
        'These pass through by reference - form.reset() will not restore them and user mutation ' +
        'will corrupt the pristine state. Convert to plain objects before passing to the form.'
      );
    }
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value as object)) {
    out[k] = deepClone((value as Record<string, unknown>)[k]);
  }
  return out as T;
}
