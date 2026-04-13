/**
 * Immutably set a nested value at a dotted path. Clones every object/array
 * along the path so downstream identity checks catch the change.
 */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  if (!path) return value as T;
  const parts = path.split('.');
  const clone = cloneContainer(obj, parts[0]);
  let cur: Record<string, unknown> = clone as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cur[key];
    const nextKey = parts[i + 1];
    const cloned = cloneContainer(next, nextKey);
    cur[key] = cloned;
    cur = cloned as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return clone as T;
}

function cloneContainer(value: unknown, nextKey: string): unknown {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return { ...(value as object) };
  // Need to create a container - choose array vs object based on nextKey shape
  return /^\d+$/.test(nextKey) ? [] : {};
}
