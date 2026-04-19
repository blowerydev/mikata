/**
 * Route-level `action()` functions for `@mikata/kit`.
 *
 * Usage:
 *
 *   // routes/users/[id].tsx
 *   export async function action({ request, params }: ActionContext) {
 *     const form = await request.formData();
 *     await db.users.update(params.id, { name: form.get('name') });
 *     return { ok: true };
 *   }
 *
 *   export default function UserPage() {
 *     const data = useLoaderData<typeof load>();
 *     const result = useActionData<typeof action>();
 *     return (
 *       <Form method="post">
 *         <input name="name" defaultValue={data()?.user.name} />
 *         <button>Save</button>
 *         {result()?.ok && <p>Saved!</p>}
 *       </Form>
 *     );
 *   }
 *
 * Data flow mirrors `@mikata/kit/loader`:
 *
 *   Server (POST) →  kit invokes the matched leaf route's `action()`,
 *                    keyed by `route.fullPath`, then re-runs the match
 *                    chain's loaders (so any DB mutation is visible to
 *                    the render). Both maps are serialised into the
 *                    hydration payload.
 *   Client mount  →  kit reads both globals and hands them to
 *                    `provideActionData()` / `provideLoaderData()`.
 *                    `useActionData()` returns the seeded result on
 *                    the first render after submit, and reverts to
 *                    `undefined` on the next navigation.
 */

import { computed, signal, type ReadSignal } from '@mikata/reactivity';
import { createContext, provide, inject } from '@mikata/runtime';
import { useRoute } from '@mikata/router';

export interface ActionContext {
  /** The inbound Request. Use `.formData()` / `.json()` to read the body. */
  request: Request;
  /** Path params for the matched leaf route. */
  params: Record<string, string>;
  /** Full request URL (pathname + search + hash). */
  url: string;
}

/**
 * Actions return a plain value (serialised into the action-data map) or
 * a `Response` (used for redirects — kit forwards the status + Location
 * header to the adapter instead of rendering the page).
 */
export type Action<T = unknown> = (
  ctx: ActionContext,
) => T | Response | Promise<T | Response>;

/**
 * Serialised error kit records when an `action()` function throws. Only
 * `message` + `name` round-trip through the hydration payload — stack
 * traces would leak server paths and bloat the response.
 */
export interface SerializedActionError {
  message: string;
  name: string;
}

/**
 * Tagged entry in the action-data map: success carries `data`, failure
 * carries `error`. Missing entries mean the route has no action export
 * or the request wasn't a mutation.
 */
export type ActionEntry<T = unknown> =
  | { data: T }
  | { error: SerializedActionError };

/** Map of `route.fullPath` → action entry. */
export type ActionData = Readonly<Record<string, ActionEntry>>;

/**
 * Signal-backed store for action results. Only the most recent
 * submission's leaf-route result lives here; navigation clears it so a
 * subsequent route reading `useActionData()` sees `undefined` unless
 * that route itself just handled a submit.
 */
export interface ActionStore {
  /** Reactive read of the full path→entry map. */
  data: ReadSignal<ActionData>;
  /** Record a successful action result for a route. */
  set(fullPath: string, value: unknown): void;
  /** Record a failed action result for a route. */
  setError(fullPath: string, error: unknown): void;
  /** Drop every entry — call on navigation so data doesn't leak across routes. */
  clear(): void;
}

const ActionDataContext = createContext<ActionStore>(createActionStore({}));

/** Global name used to round-trip action data through the page shell. */
export const ACTION_DATA_GLOBAL = '__MIKATA_ACTION_DATA__';

/**
 * Build an action store seeded with the given initial data. Exposed so
 * kit's server/client entries can hand a freshly-built store to
 * `provideActionData()`; user code typically never reaches for this
 * directly.
 */
export function createActionStore(initial: ActionData): ActionStore {
  const [data, setData] = signal<ActionData>({ ...initial });
  return {
    data,
    set(fullPath, value) {
      setData({ ...data(), [fullPath]: { data: value } });
    },
    setError(fullPath, err) {
      setData({ ...data(), [fullPath]: { error: serializeError(err) } });
    },
    clear() {
      setData({});
    },
  };
}

function serializeError(err: unknown): SerializedActionError {
  if (err instanceof Error) {
    return { message: err.message, name: err.name };
  }
  return { message: String(err), name: 'Error' };
}

/**
 * Seed the action-data context for the current render scope. Accepts a
 * plain map (creates a fresh store) or a pre-built `ActionStore` — kit's
 * client entry passes a store so it can mutate across navigations.
 */
export function provideActionData(input: ActionData | ActionStore): void {
  const store = isActionStore(input) ? input : createActionStore(input);
  provide(ActionDataContext, store);
}

function isActionStore(value: ActionData | ActionStore): value is ActionStore {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ActionStore).set === 'function' &&
    typeof (value as ActionStore).clear === 'function' &&
    typeof (value as ActionStore).data === 'function'
  );
}

/**
 * Reactive accessor for the action result of the route that owns the
 * calling component. Returns `undefined` when no submission has been
 * handled for this route, or after a navigation clears the store.
 *
 * Mirrors `useLoaderData` for errors: if the route's most recent
 * `action()` threw, calling this accessor rethrows a synthesised
 * `Error` so a parent `ErrorBoundary` can render its fallback.
 *
 * Type parameter: pass `typeof action` to get the inferred result shape.
 *   const result = useActionData<typeof action>();
 */
export function useActionData<
  A extends Action<unknown> = Action<unknown>,
>(): ReadSignal<Awaited<ReturnType<A>> | undefined> {
  const store = inject(ActionDataContext);
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
    return entry.data as Awaited<ReturnType<A>> | undefined;
  });
}

/**
 * Small convenience for action functions that want to redirect after a
 * successful mutation. Returns a `Response` with the given Location
 * header; kit's adapter recognises it and replies with a 302 (or the
 * supplied status) instead of rendering the page.
 *
 *   export async function action({ request }: ActionContext) {
 *     await db.posts.create(await request.formData());
 *     return redirect('/posts');
 *   }
 */
export function redirect(url: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: { Location: url },
  });
}
