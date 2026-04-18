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
 *                     with. Client-side navigation does NOT re-run loaders
 *                     in v1 — use `createQuery` for dynamic refetching.
 */

import { computed, type ReadSignal } from '@mikata/reactivity';
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
 * Map of `route.fullPath` → resolved loader data. Writable only via
 * `provideLoaderData()`; consumers see it through `useLoaderData()`.
 */
export type LoaderData = Readonly<Record<string, unknown>>;

interface LoaderDataContextValue {
  data: LoaderData;
}

const LoaderDataContext = createContext<LoaderDataContextValue>({ data: {} });

/** Global name used to round-trip loader data through the page shell. */
export const LOADER_DATA_GLOBAL = '__MIKATA_LOADER_DATA__';

/**
 * Seed the loader-data context for the current render scope. Call once
 * at the App root — `@mikata/kit`'s server/client entries do this for
 * you; reach for it yourself only if you're embedding kit in a custom
 * host.
 */
export function provideLoaderData(data: LoaderData): void {
  provide(LoaderDataContext, { data });
}

/**
 * Reactive accessor for the loader data of the route that owns the
 * calling component. Returns `undefined` when the route has no loader
 * or the current match isn't resolvable (e.g. called outside any route
 * outlet).
 *
 * Type parameter: pass `typeof load` to get the inferred data shape.
 *   const data = useLoaderData<typeof load>();
 */
export function useLoaderData<
  L extends Loader<unknown> = Loader<unknown>,
>(): ReadSignal<Awaited<ReturnType<L>> | undefined> {
  const { data } = inject(LoaderDataContext);
  const match = useRoute();
  return computed(() => {
    const current = match();
    if (!current) return undefined;
    return data[current.route.fullPath] as
      | Awaited<ReturnType<L>>
      | undefined;
  });
}
