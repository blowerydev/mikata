/**
 * Shared debounce + cancellation helper for async-data dropdowns
 * (Autocomplete / MultiSelect / Select). Keeps at most one in-flight request
 * per controller: a newer `request()` aborts the pending fetch (or the pending
 * debounce timer) so stale results can never overwrite fresher ones.
 */

export type AsyncOptionsFn<T> = (
  query: string,
  signal: AbortSignal,
) => Promise<T[]>;

export interface AsyncDataHandlers<T> {
  /** Fires before the fetcher runs and when it settles (after the debounce). */
  onLoading: (loading: boolean) => void;
  /** Fires with a fulfilled, non-aborted result. */
  onResult: (items: T[], query: string) => void;
  /** Optional. Non-abort errors bubble here; aborts are swallowed. */
  onError?: (err: unknown, query: string) => void;
}

export interface AsyncDataOptions<T> extends AsyncDataHandlers<T> {
  /** Debounce window in ms. Default: 300. */
  debounceMs?: number;
}

export interface AsyncDataController {
  /** Schedule a fetch for `query`, cancelling any pending/in-flight one. */
  request(query: string): void;
  /** Abort any in-flight/pending work. Idempotent. */
  dispose(): void;
}

export function createAsyncDataController<T>(
  fetcher: AsyncOptionsFn<T>,
  opts: AsyncDataOptions<T>,
): AsyncDataController {
  const { debounceMs = 300, onLoading, onResult, onError } = opts;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let disposed = false;

  function cancel(): void {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    if (controller) {
      controller.abort();
      controller = null;
    }
  }

  function run(query: string): void {
    if (disposed) return;
    const ctrl = new AbortController();
    controller = ctrl;
    onLoading(true);

    Promise.resolve()
      .then(() => fetcher(query, ctrl.signal))
      .then(
        (items) => {
          if (ctrl.signal.aborted || disposed) return;
          onResult(items, query);
          onLoading(false);
          if (controller === ctrl) controller = null;
        },
        (err) => {
          if (ctrl.signal.aborted || disposed) return;
          if (err && (err as { name?: string }).name === 'AbortError') return;
          onError?.(err, query);
          onLoading(false);
          if (controller === ctrl) controller = null;
        },
      );
  }

  return {
    request(query: string): void {
      if (disposed) return;
      cancel();
      timer = setTimeout(() => {
        timer = null;
        run(query);
      }, debounceMs);
    },
    dispose(): void {
      disposed = true;
      cancel();
      // Loading state belongs to the caller — we don't flip it on dispose.
    },
  };
}
