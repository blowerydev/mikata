/**
 * createQuery — reactive async data fetching with caching,
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
  type ReadSignal,
} from '@mikata/reactivity';

declare const __DEV__: boolean;

export interface QueryOptions<T, K = unknown> {
  /** Reactive cache key — re-fetches when key changes */
  key: () => K;
  /** The async function that fetches data */
  fn: (key: K, info: { signal: AbortSignal }) => Promise<T>;
  /** Milliseconds before data is considered stale (default: 0) */
  staleTime?: number;
  /** Number of retries on failure (default: 3, false to disable) */
  retry?: number | false;
  /** Delay between retries in ms, or function of attempt (default: exponential backoff) */
  retryDelay?: number | ((attempt: number) => number);
  /** Reactive condition — query won't run when false */
  enabled?: () => boolean;
  /** Initial data to use before first fetch */
  initialData?: T;
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

  // Watch the key reactively — re-fetch when key changes
  effect(() => {
    const enabled = options.enabled?.() ?? true;
    if (!enabled) return;

    const key = options.key();
    retryCount = 0;
    execute(key);

    return () => {
      abortController?.abort();
    };
  });

  // Abort on cleanup (scope disposal)
  onCleanup(() => {
    abortController?.abort();
  });

  return {
    data,
    error,
    status,
    isFetching,
    isLoading: computed(() => status() === 'loading'),
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
