/**
 * Route-level `load()` functions for `@mikata/kit`.
 *
 * Usage:
 *
 *   // routes/users/[id].tsx
 *   export async function load({ params }: LoadContext) {
 *     return { user: await fetchUser(params.id) };
 *   }
 *
 *   export default function UserPage() {
 *     const data = useLoaderData<typeof load>();
 *     return <h1>{data()?.user.name}</h1>;
 *   }
 *
 * Data flow:
 *
 *   Server render  →  kit invokes `load()` for every matched route,
 *                     keyed by `route.fullPath`; the map is provided via
 *                     `LoaderDataContext` before the tree renders.
 *   Serialization →  kit emits a script assigning the map to
 *                     `window.__MIKATA_LOADER_DATA__`.
 *   Client mount  →  kit re-reads the global and calls
 *                     `provideLoaderData()` inside the App closure, so
 *                     `useLoaderData()` sees the same map hydration started
 *                     with. Each entry is a `LoaderEntry` — either
 *                     `{ data }` or `{ error }` — so a load()-that-threw
 *                     on the server surfaces as a thrown Error on the
 *                     first `useLoaderData()` read (caught by a parent
 *                     `ErrorBoundary`).
 */

import { computed, signal, type ReadSignal } from '@mikata/reactivity';
import { createContext, provide, inject } from '@mikata/runtime';
import { useRoute } from '@mikata/router';

export interface LoadContext {
  /** Path params for the matched route (e.g. `{ id: '42' }`). */
  params: Record<string, string>;
  /** The full request URL (pathname + search + hash). */
  url: string;
}

export type Loader<T = unknown> = (ctx: LoadContext) => T | Promise<T>;

/**
 * Serialised error the server records when a `load()` function throws.
 * Only `message` + `name` are round-tripped — stack traces would leak
 * server paths and inflate the payload. Consumers never see this shape
 * directly; `useLoaderData()` rehydrates it into a thrown Error.
 */
export interface SerializedLoaderError {
  message: string;
  name: string;
}

/**
 * Single entry in the loader-data map. Success carries `data`; failure
 * carries `error`. Using a tagged shape (rather than a bare value)
 * means a loader that successfully returned `undefined` is still
 * distinguishable from a loader that hasn't been invoked yet.
 */
export type LoaderEntry<T = unknown> =
  | { data: T }
  | { error: SerializedLoaderError };

/**
 * Map of `route.fullPath` → loader entry. Writable only via the loader
 * store's `set()` / `setError()` methods; consumers see it through
 * `useLoaderData()`.
 */
export type LoaderData = Readonly<Record<string, LoaderEntry>>;

/**
 * Signal-backed store the loader context provides. Kit's server entry
 * seeds this once per render; the client entry seeds it from the
 * embedded global and then mutates it as `load()` re-runs on navigation.
 */
export interface LoaderStore {
  /** Reactive read of the full path→entry map. */
  data: ReadSignal<LoaderData>;
  /** Record a successful loader result for a route. */
  set(fullPath: string, value: unknown): void;
  /** Record a failed loader result for a route. */
  setError(fullPath: string, error: unknown): void;
}

const LoaderDataContext = createContext<LoaderStore>(createLoaderStore({}));

/** Global name used to round-trip loader data through the page shell. */
export const LOADER_DATA_GLOBAL = '__MIKATA_LOADER_DATA__';

/**
 * Build a loader store seeded with the given initial data. Exposed so
 * kit's server/client entries can hand a freshly-built store to
 * `provideLoaderData()` — user code typically reaches for
 * `provideLoaderData()` with a plain object instead.
 */
export function createLoaderStore(initial: LoaderData): LoaderStore {
  const [data, setData] = signal<LoaderData>({ ...initial });
  return {
    data,
    set(fullPath, value) {
      setData({ ...data(), [fullPath]: { data: value } });
    },
    setError(fullPath, err) {
      setData({ ...data(), [fullPath]: { error: serializeError(err) } });
    },
  };
}

function serializeError(err: unknown): SerializedLoaderError {
  if (err instanceof Error) {
    return { message: err.message, name: err.name };
  }
  return { message: String(err), name: 'Error' };
}

/**
 * Seed the loader-data context for the current render scope. Accepts a
 * plain map (creates a fresh store) or a pre-built `LoaderStore` —
 * kit's client entry passes a store so it can mutate across navigations.
 * Reach for this yourself only if you're embedding kit in a custom host.
 */
export function provideLoaderData(input: LoaderData | LoaderStore): void {
  const store = isLoaderStore(input) ? input : createLoaderStore(input);
  provide(LoaderDataContext, store);
}

function isLoaderStore(value: LoaderData | LoaderStore): value is LoaderStore {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LoaderStore).set === 'function' &&
    typeof (value as LoaderStore).setError === 'function' &&
    typeof (value as LoaderStore).data === 'function'
  );
}

/**
 * Reactive accessor for the loader data of the route that owns the
 * calling component. Returns `undefined` when the route has no loader
 * or the current match isn't resolvable (e.g. called outside any route
 * outlet). Updates automatically when the client re-runs `load()` on
 * navigation.
 *
 * If the route's most recent `load()` threw (either on the server, which
 * serialises the error into the hydration payload, or during a client
 * navigation), calling this accessor throws a synthesised `Error` so a
 * parent `ErrorBoundary` can render its fallback.
 *
 * Type parameter: pass `typeof load` to get the inferred data shape.
 *   const data = useLoaderData<typeof load>();
 */
export function useLoaderData<
  L extends Loader<unknown> = Loader<unknown>,
>(): ReadSignal<Awaited<ReturnType<L>> | undefined> {
  const store = inject(LoaderDataContext);
  const match = useRoute();
  return computed(() => {
    const current = match();
    if (!current) return undefined;
    const entry = store.data()[current.route.fullPath];
    if (!entry) return undefined;
    if ('error' in entry) {
      const err = new Error(entry.error.message);
      err.name = entry.error.name;
      throw err;
    }
    return entry.data as Awaited<ReturnType<L>> | undefined;
  });
}
