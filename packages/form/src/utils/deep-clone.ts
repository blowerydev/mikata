/**
 * Clones plain JSON-ish values (objects, arrays, primitives). DOES NOT handle
 * Dates/Maps/Sets/class instances — those pass through by reference. The form
 * package only ever clones `initialValues`, which is JSON-shaped.
 */
export function deepClone<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepClone) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value as object)) {
    out[k] = deepClone((value as Record<string, unknown>)[k]);
  }
  return out as T;
}
