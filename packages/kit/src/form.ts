/**
 * `<Form>` component for `@mikata/kit`.
 *
 * Renders a plain `<form method="post">` — but with JS enabled, the
 * first submit is intercepted and handled by `fetch()` so the page
 * doesn't reload:
 *
 *   1. POST to the form's action URL with `Accept: application/json`
 *      and an `X-Mikata-Form: 1` header so the server adapter
 *      responds with action + loader data instead of a full page.
 *   2. Update the action + loader stores with the JSON payload —
 *      consumers of `useActionData()` / `useLoaderData()` rerender
 *      against the new values automatically.
 *   3. Follow any `redirect` the response included by calling
 *      `router.navigate()`.
 *
 * Without JS the browser handles the whole flow natively: it POSTs
 * to `action`, the server adapter runs the action + loaders and
 * re-renders the page HTML, the browser loads it. Either path
 * produces the same final state.
 */

import type { Router } from '@mikata/router';
import { createContext, provide, inject } from '@mikata/runtime';
import type { ActionStore } from './action';
import type { LoaderStore } from './loader';

declare const __DEV__: boolean;

export type FormMethod = 'post' | 'put' | 'patch' | 'delete';

export interface FormProps {
  /**
   * HTTP verb the form submits with. Defaults to `post`. GET is
   * intentionally excluded — GET submissions don't trigger actions,
   * and for plain navigation `<Link>` is the better tool.
   */
  method?: FormMethod;
  /**
   * Submission URL. Defaults to the current route. Relative paths
   * are resolved against the current URL the same way the browser
   * resolves them for a native `<form action="">`.
   */
  action?: string;
  /**
   * Form encoding. `application/x-www-form-urlencoded` is the default
   * and covers most forms; `multipart/form-data` is required when any
   * `<input type="file">` is present.
   */
  encType?: 'application/x-www-form-urlencoded' | 'multipart/form-data';
  /**
   * Skip the fetch interception and let the browser submit natively.
   * Use when you explicitly want a full-page reload (the form becomes
   * a regular `<form>` element). Default: `false`.
   */
  reloadDocument?: boolean;
  /**
   * Called before the enhanced fetch runs. Invoke `event.preventDefault()`
   * to cancel the submission entirely; otherwise the fetch proceeds.
   * Useful for client-side validation.
   */
  onSubmit?: (event: SubmitEvent) => void;
  children?: Node | Node[];
  /** Extra attributes forwarded to the underlying `<form>` element. */
  [key: string]: unknown;
}

/**
 * Values kit serves to enhanced submits. Matches the shape the server
 * adapter writes when it sees `X-Mikata-Form: 1`.
 */
export interface FormSubmitResponse {
  /** One entry per matched route that had an `action` export. */
  actionData?: Record<string, unknown>;
  /** One entry per matched route that had a `load` export. */
  loaderData?: Record<string, unknown>;
  /** Present when the action returned a Response with a `Location` header. */
  redirect?: { url: string; status: number };
  /** HTTP status the response carried. */
  status?: number;
}

/**
 * Context kit's `mount()` fills in before rendering. The Form component
 * pulls these out to wire up enhanced submit — the store handles are
 * the same instances `mount()` provides to the rest of the app, so an
 * update here is visible to every `useLoaderData()` / `useActionData()`
 * reader in the tree.
 */
export interface FormContextValue {
  router: Router;
  actionStore: ActionStore;
  loaderStore: LoaderStore;
}

export const FormContext = createContext<FormContextValue>();

/** Seed the Form context — called by kit's `mount()` internally. */
export function provideFormContext(value: FormContextValue): void {
  provide(FormContext, value);
}

/**
 * Request header kit's `<Form>` sets so the server adapter can tell a
 * JS-enhanced submit from a plain HTML POST. Exported so custom
 * adapters can branch on it.
 */
export const FORM_SUBMIT_HEADER = 'X-Mikata-Form';

export function Form(props: FormProps): HTMLFormElement {
  const form = document.createElement('form');
  const method = props.method ?? 'post';
  const encType = props.encType ?? 'application/x-www-form-urlencoded';
  // Use setAttribute rather than assigning the DOM properties so these
  // show up in the SSR serialised markup — the shim only serializes
  // attributes, not the `method` / `enctype` getters.
  form.setAttribute('method', method);
  form.setAttribute('enctype', encType);
  if (props.action) form.setAttribute('action', props.action);

  // Forward any extra attributes (e.g. class, id, aria-*). Skip the
  // keys we treat specially so, for example, `children` doesn't land
  // on the DOM as an attribute.
  const RESERVED = new Set([
    'method',
    'action',
    'encType',
    'reloadDocument',
    'onSubmit',
    'children',
  ]);
  for (const [key, value] of Object.entries(props)) {
    if (RESERVED.has(key)) continue;
    if (value == null || value === false) continue;
    if (value === true) {
      form.setAttribute(key, '');
    } else {
      form.setAttribute(key, String(value));
    }
  }

  appendChildren(form, props.children);

  // Only install the enhancement hook when a live `window.fetch` is
  // available — on the server we're building markup, not handling
  // events, so the listener would never fire anyway (and the shim's
  // addEventListener is a no-op either way).
  if (typeof window !== 'undefined' && !props.reloadDocument) {
    form.addEventListener('submit', (event) => {
      if (props.onSubmit) {
        props.onSubmit(event as SubmitEvent);
        if (event.defaultPrevented) return;
      }
      // Delegate to the enhanced submit path. It calls preventDefault()
      // itself so the browser doesn't also do a native submit.
      void enhancedSubmit(form, event as SubmitEvent);
    });
  }

  return form;
}

async function enhancedSubmit(
  form: HTMLFormElement,
  event: SubmitEvent,
): Promise<void> {
  const ctx = inject(FormContext);
  if (!ctx) {
    // No kit context means we're being used outside `mount()` — fall
    // back to native submission so the form still works. We already
    // attached the listener synchronously, so this is the earliest we
    // can notice the missing context.
    return;
  }
  event.preventDefault();

  const { router, actionStore, loaderStore } = ctx;
  const method = (form.method || 'post').toUpperCase();
  const actionUrl = form.getAttribute('action') || router.route().path;

  // Build the body from the form itself so the encoding matches what
  // a native submission would have produced. Using a fresh FormData
  // also picks up any programmatic changes the onSubmit handler made.
  const formData = new FormData(form);

  let response: Response;
  try {
    response = await fetch(actionUrl, {
      method,
      body: formData,
      headers: {
        Accept: 'application/json',
        [FORM_SUBMIT_HEADER]: '1',
      },
    });
  } catch (err) {
    // Network/CORS failure. Surface under the current route's
    // fullPath so `useActionData()` in the form's own subtree can
    // react via its ErrorBoundary.
    const leaf = router.route().matches.at(-1);
    if (leaf) actionStore.setError(leaf.route.fullPath, err);
    return;
  }

  // Redirect-as-payload: the action returned a Response with a
  // Location header, and the adapter forwarded that into JSON
  // instead of actually redirecting (so we stay on the page until
  // the stores settle).
  let payload: FormSubmitResponse = {};
  if (response.headers.get('content-type')?.includes('application/json')) {
    try {
      payload = (await response.json()) as FormSubmitResponse;
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[mikata/kit] Form response was not valid JSON:', err);
      }
    }
  }

  if (payload.actionData) {
    for (const [fullPath, value] of Object.entries(payload.actionData)) {
      actionStore.set(fullPath, value);
    }
  }
  if (payload.loaderData) {
    for (const [fullPath, value] of Object.entries(payload.loaderData)) {
      loaderStore.set(fullPath, value);
    }
  }

  if (payload.redirect) {
    await router.navigate(payload.redirect.url);
  }
}

function appendChildren(
  parent: HTMLElement,
  children: FormProps['children'],
): void {
  if (children == null) return;
  const list = Array.isArray(children) ? children : [children];
  // `Node` is a browser global; on the SSR server it's undefined, so fall
  // back to duck-typing on `appendChild`-accepting objects.
  const NodeCtor = typeof Node !== 'undefined' ? Node : null;
  for (const child of list) {
    if (child == null) continue;
    const isNode = NodeCtor
      ? child instanceof NodeCtor
      : typeof child === 'object' && 'nodeType' in (child as object);
    if (isNode) {
      parent.appendChild(child as Node);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }
}
