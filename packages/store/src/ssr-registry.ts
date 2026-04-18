/**
 * SSR query registry.
 *
 * During server rendering, `createQuery` registers its `refetch()` promise
 * and a stable serialisation key with the active registry. `@mikata/server`
 * wraps a render in `beginCollect()` / `collectAll()` / `endCollect()` to
 * await every fetch, then serialises the collected data into a state payload
 * the client re-hydrates from.
 */

interface QueryEntry {
  key: string;
  /** Fires the underlying fetch and resolves to the data (or undefined). */
  refetch: () => Promise<unknown>;
  /** Populated by `collectAll()` once the refetch settles. */
  data: unknown;
  resolved: boolean;
}

interface Registry {
  entries: Map<string, QueryEntry>;
  /** Queries spawned during the most recent collectAll wave. */
  pending: Set<QueryEntry>;
}

let active: Registry | null = null;

export function beginCollect(): void {
  active = { entries: new Map(), pending: new Set() };
}

export function endCollect(): void {
  active = null;
}

/**
 * Register a query with the current SSR registry, if any. Returns the
 * hydration-key that was used so the server can map back to payload entries.
 *
 * `serialiseKey` is the reactive key passed to `createQuery({ key })` — the
 * registry stringifies it deterministically so two queries with the same
 * logical cache key collapse to one payload slot.
 */
export function registerSSRQuery(
  serialiseKey: unknown,
  refetch: () => Promise<unknown>,
): string | null {
  if (!active) return null;
  const key = stableStringify(serialiseKey);
  let entry = active.entries.get(key);
  if (!entry) {
    entry = { key, refetch, data: undefined, resolved: false };
    active.entries.set(key, entry);
  }
  if (!entry.resolved) active.pending.add(entry);
  return key;
}

/**
 * Await every registered query, including ones spawned transitively inside
 * resolved `.then()` callbacks. Loops until the pending set stays empty
 * across a wave — the user-visible contract is "SSR awaits the data graph".
 *
 * A `maxWaves` guard (default 10) prevents pathological infinite cascades
 * in buggy user code.
 */
export async function collectAll(maxWaves = 10): Promise<Record<string, unknown>> {
  if (!active) return {};
  let waves = 0;
  while (active.pending.size > 0) {
    if (waves++ >= maxWaves) {
      if (typeof console !== 'undefined') {
        console.warn(
          `[mikata] SSR query collection hit ${maxWaves} waves; bailing out. ` +
          `This usually means queries are being created in a loop during render.`,
        );
      }
      break;
    }
    const wave = [...active.pending];
    active.pending.clear();
    await Promise.all(
      wave.map(async (entry) => {
        try {
          entry.data = await entry.refetch();
        } catch {
          entry.data = undefined;
        }
        entry.resolved = true;
      }),
    );
  }
  const out: Record<string, unknown> = {};
  for (const [k, entry] of active.entries) out[k] = entry.data;
  return out;
}

/**
 * Deterministic JSON stringify: sorts object keys so `{a:1,b:2}` and
 * `{b:2,a:1}` serialise identically. Handles primitives, arrays, plain
 * objects; falls back to `String(x)` for anything exotic.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalise(value));
}

function canonicalise(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalise);
  const out: Record<string, unknown> = {};
  const keys = Object.keys(value as object).sort();
  for (const k of keys) {
    out[k] = canonicalise((value as Record<string, unknown>)[k]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Client-side hydration lookup
// ---------------------------------------------------------------------------

const HYDRATION_GLOBAL = '__MIKATA_STATE__';

/**
 * Read pre-rendered data for a given query key from the hydration payload
 * embedded by `@mikata/server`. Returns `undefined` if no payload is present
 * (dev run, or the caller isn't on the client).
 */
export function readHydratedData<T>(serialiseKey: unknown): T | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  const g = globalThis as unknown as Record<string, unknown>;
  const state = g[HYDRATION_GLOBAL] as Record<string, unknown> | undefined;
  if (!state) return undefined;
  const key = stableStringify(serialiseKey);
  return (state[key] as T | undefined) ?? undefined;
}
