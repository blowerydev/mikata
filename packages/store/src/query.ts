/**
 * createQuery - reactive async data fetching with caching,
 * loading/error states, abort, and retry.
 *
 * Inspired by TanStack Query but integrated with Mikata's reactivity.
 */

import {
  signal,
  computed,
  effect,
  untrack,
  onCleanup,
  getCurrentScope,
  type ReadSignal,
} from '@mikata/reactivity';

declare const __DEV__: boolean;

/**
 * Wire-compatible with `@mikata/runtime`'s `SUSPENSE_CONTEXT_KEY`. Uses
 * `Symbol.for` so both packages resolve to the same key without @mikata/store
 * having to depend on @mikata/runtime.
 */
const SUSPENSE_CONTEXT_KEY: symbol = Symbol.for('mikata:suspense-boundary');

interface SuspenseBoundaryLike {
  register(isLoading: ReadSignal<boolean>): void;
}

function findSuspenseBoundary(): SuspenseBoundaryLike | null {
  let scope = getCurrentScope();
  while (scope) {
    const entry = scope.getContext(SUSPENSE_CONTEXT_KEY);
    if (entry) return entry as SuspenseBoundaryLike;
    scope = scope.parent;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tag-based invalidation
// ---------------------------------------------------------------------------
//
// Queries declare `tags` describing what data they depend on. Mutations
// declare `invalidates` describing what data they affect. When a mutation
// resolves, matching queries refetch — the mutation never needs to know
// which specific queries exist. Tags are literal strings; callers compose
// hierarchy themselves (e.g. `"user:42"`, `"customer:7:orders"`).

interface Invalidatable {
  refetch: () => Promise<unknown>;
}

const tagRegistry = new Map<string, Set<Invalidatable>>();

function registerTags(entry: Invalidatable, tags: readonly string[]): () => void {
  for (const tag of tags) {
    let set = tagRegistry.get(tag);
    if (!set) {
      set = new Set();
      tagRegistry.set(tag, set);
    }
    set.add(entry);
  }
  return () => {
    for (const tag of tags) {
      const set = tagRegistry.get(tag);
      if (!set) continue;
      set.delete(entry);
      if (set.size === 0) tagRegistry.delete(tag);
    }
  };
}

/**
 * Refetch every query whose `tags` overlap with the given set. Each matching
 * query is refetched exactly once even if it's tagged by multiple inputs.
 * The returned promise resolves when all refetches have settled.
 */
export function invalidateTags(tags: string | readonly string[]): Promise<void> {
  const list = typeof tags === 'string' ? [tags] : tags;
  const seen = new Set<Invalidatable>();
  for (const tag of list) {
    const set = tagRegistry.get(tag);
    if (!set) continue;
    for (const entry of set) seen.add(entry);
  }
  if (seen.size === 0) return Promise.resolve();
  return Promise.all(
    [...seen].map((e) => e.refetch().catch(() => undefined)),
  ).then(() => undefined);
}

/** Alias for callers invalidating a single tag. */
export const invalidateTag = invalidateTags;

/** Test-only: drop the tag registry. */
export function _resetTagRegistry(): void {
  tagRegistry.clear();
}

export interface QueryOptions<T, K = unknown> {
  /** Reactive cache key - re-fetches when key changes */
  key: () => K;
  /** The async function that fetches data */
  fn: (key: K, info: { signal: AbortSignal }) => Promise<T>;
  /** Milliseconds before data is considered stale (default: 0) */
  staleTime?: number;
  /** Number of retries on failure (default: 3, false to disable) */
  retry?: number | false;
  /** Delay between retries in ms, or function of attempt (default: exponential backoff) */
  retryDelay?: number | ((attempt: number) => number);
  /** Reactive condition - query won't run when false */
  enabled?: () => boolean;
  /** Initial data to use before first fetch */
  initialData?: T;
  /**
   * When true, register with the nearest `<Suspense>` boundary ancestor so
   * the boundary shows its fallback until this query resolves once. Later
   * refetches do not re-trigger the fallback - use `isFetching` for
   * per-query spinners instead.
   */
  suspend?: boolean;
  /**
   * Tags this query is associated with. A mutation calling
   * `invalidates: [...]` with any overlapping tag — or an imperative
   * `invalidateTags([...])` — will trigger this query to refetch.
   *
   * Pass a function for reactive tags (re-registers when the result
   * changes). Tags are compared by string equality; callers compose
   * hierarchy themselves (e.g. `['user', 'user:' + id]`).
   */
  tags?: readonly string[] | (() => readonly string[]);
}

export interface QueryResult<T> {
  data: ReadSignal<T | undefined>;
  error: ReadSignal<Error | null>;
  status: ReadSignal<'idle' | 'loading' | 'error' | 'success'>;
  isLoading: ReadSignal<boolean>;
  isError: ReadSignal<boolean>;
  isSuccess: ReadSignal<boolean>;
  isFetching: ReadSignal<boolean>;
  refetch: () => Promise<T | undefined>;
}

export function createQuery<T, K = unknown>(
  options: QueryOptions<T, K>
): QueryResult<T> {
  if (__DEV__) {
    if (typeof options.key !== 'function') {
      throw new Error(
        `[mikata] createQuery() "key" must be a function returning the cache key, got ${typeof options.key}.`
      );
    }
    if (typeof options.fn !== 'function') {
      throw new Error(
        `[mikata] createQuery() "fn" must be an async function, got ${typeof options.fn}.`
      );
    }
    if (options.retry !== undefined && options.retry !== false) {
      if (typeof options.retry !== 'number' || options.retry < 0) {
        console.warn(
          `[mikata] createQuery() "retry" should be a non-negative number or false, got ${JSON.stringify(options.retry)}.`
        );
      }
    }
    if (options.staleTime !== undefined && (typeof options.staleTime !== 'number' || options.staleTime < 0)) {
      console.warn(
        `[mikata] createQuery() "staleTime" should be a non-negative number in milliseconds, got ${JSON.stringify(options.staleTime)}.`
      );
    }
  }

  const [data, setData] = signal<T | undefined>(options.initialData);
  const [error, setError] = signal<Error | null>(null);
  const [status, setStatus] = signal<'idle' | 'loading' | 'error' | 'success'>(
    options.initialData ? 'success' : 'idle'
  );
  const [isFetching, setIsFetching] = signal(false);

  let abortController: AbortController | null = null;
  let retryCount = 0;
  const maxRetries = options.retry === false ? 0 : (options.retry ?? 3);

  async function execute(key: K): Promise<T | undefined> {
    // Abort previous request
    abortController?.abort();
    abortController = new AbortController();
    const currentController = abortController;

    setIsFetching(true);
    if (!data()) setStatus('loading');

    try {
      const result = await options.fn(key, { signal: currentController.signal });

      // Check if this request was aborted (another one started)
      if (currentController.signal.aborted) return undefined;

      setData(() => result);
      setError(null);
      setStatus('success');
      retryCount = 0;
      return result;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return undefined;
      if (currentController.signal.aborted) return undefined;

      if (retryCount < maxRetries) {
        retryCount++;
        const delay = typeof options.retryDelay === 'function'
          ? options.retryDelay(retryCount)
          : (options.retryDelay ?? 1000 * Math.pow(2, retryCount - 1));

        await new Promise((r) => setTimeout(r, delay));
        if (!currentController.signal.aborted) {
          return execute(key);
        }
      }

      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
      return undefined;
    } finally {
      if (!currentController.signal.aborted) {
        setIsFetching(false);
      }
    }
  }

  // Watch the key reactively - re-fetch when key changes. `execute()` reads
  // signals like `data()` before its first await, which would otherwise make
  // this effect subscribe to its own outputs and refetch on every setData.
  // Wrap the call in untrack so only `enabled()` and `key()` participate.
  effect(() => {
    const enabled = options.enabled?.() ?? true;
    if (!enabled) return;

    const key = options.key();
    retryCount = 0;
    untrack(() => execute(key));

    return () => {
      abortController?.abort();
    };
  });

  // Abort on cleanup (scope disposal)
  onCleanup(() => {
    abortController?.abort();
  });

  // Tag registration. Static tag arrays register once synchronously; function
  // tags register reactively via an effect so they re-register on change.
  if (options.tags) {
    const refetchEntry: Invalidatable = {
      refetch: () => execute(untrack(options.key)),
    };
    if (typeof options.tags === 'function') {
      const tagsFn = options.tags;
      effect(() => {
        const tags = tagsFn();
        if (!tags || tags.length === 0) return;
        return registerTags(refetchEntry, tags);
      });
    } else {
      const unregister = registerTags(refetchEntry, options.tags);
      onCleanup(unregister);
    }
  }

  const isLoading = computed(() => status() === 'loading');

  if (options.suspend) {
    const boundary = findSuspenseBoundary();
    // Report "loading" until the first fetch resolves (success or error).
    // Once status leaves 'idle'/'loading', the query counts as resolved for
    // Suspense purposes - an error should surface through ErrorBoundary /
    // a local error view, not keep the fallback shown forever.
    const suspending = computed(() => {
      const s = status();
      return s === 'idle' || s === 'loading';
    });
    boundary?.register(suspending);
  }

  return {
    data,
    error,
    status,
    isFetching,
    isLoading,
    isError: computed(() => status() === 'error'),
    isSuccess: computed(() => status() === 'success'),
    refetch: () => execute(untrack(options.key)),
  };
}

// --- createMutation ---

export interface MutationOptions<T, V> {
  fn: (variables: V) => Promise<T>;
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: Error, variables: V) => void;
  onSettled?: (data: T | undefined, error: Error | null, variables: V) => void;
  /**
   * Tags whose queries should refetch after this mutation succeeds. Pass a
   * function to derive tags from the mutation result and variables — useful
   * for "invalidate the user I just edited":
   *
   *   invalidates: (user) => ['user', `user:${user.id}`]
   *
   * Refetches fire-and-forget; failures don't fail the mutation.
   */
  invalidates?: readonly string[] | ((data: T, variables: V) => readonly string[]);
}

export interface MutationResult<T, V> {
  data: ReadSignal<T | undefined>;
  error: ReadSignal<Error | null>;
  status: ReadSignal<'idle' | 'loading' | 'error' | 'success'>;
  isLoading: ReadSignal<boolean>;
  mutate: (variables: V) => Promise<T | undefined>;
  reset: () => void;
}

export function createMutation<T, V = void>(
  options: MutationOptions<T, V>
): MutationResult<T, V> {
  const [data, setData] = signal<T | undefined>(undefined);
  const [error, setError] = signal<Error | null>(null);
  const [status, setStatus] = signal<'idle' | 'loading' | 'error' | 'success'>('idle');

  async function mutate(variables: V): Promise<T | undefined> {
    setStatus('loading');
    setError(null);

    try {
      const result = await options.fn(variables);
      setData(() => result);
      setStatus('success');
      if (options.invalidates) {
        const tags =
          typeof options.invalidates === 'function'
            ? options.invalidates(result, variables)
            : options.invalidates;
        if (tags && tags.length > 0) {
          // Fire-and-forget — we don't want refetch failures to mask the
          // mutation's own success state.
          void invalidateTags(tags);
        }
      }
      options.onSuccess?.(result, variables);
      options.onSettled?.(result, null, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setStatus('error');
      options.onError?.(error, variables);
      options.onSettled?.(undefined, error, variables);
      return undefined;
    }
  }

  function reset() {
    setData(undefined as any);
    setError(null);
    setStatus('idle');
  }

  return {
    data,
    error,
    status,
    isLoading: computed(() => status() === 'loading'),
    mutate,
    reset,
  };
}
