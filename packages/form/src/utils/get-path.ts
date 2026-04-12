/**
 * Get a nested value by dotted path. Supports array indices:
 * `getPath({ a: { b: [{ c: 1 }] } }, 'a.b.0.c')` → `1`.
 */
export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const key of parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}
