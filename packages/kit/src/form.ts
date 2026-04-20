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
import { useCsrfToken, CSRF_FORM_FIELD, CSRF_HEADER } from './csrf';

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
   * Skip CSRF protection for this form. The hidden `_csrf` input is
   * omitted and enhanced submit doesn't send the `X-Mikata-CSRF`
   * header — the server will refuse the action with `403`. Use only
   * when the target route deliberately opts out of CSRF (e.g. a public
   * webhook endpoint accepting form data). Default: `true` (on).
   */
  csrf?: boolean;
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
  // Pull the kit context at render time — the submit listener fires
  // asynchronously, after the reactive scope has unwound, so inject()
  // inside the handler would either return undefined or throw. Capturing
  // here also lets us skip installing the listener entirely when no
  // provider is present, so the form falls back to native submission.
  let ctx: FormContextValue | undefined;
  try {
    ctx = inject(FormContext);
  } catch {
    ctx = undefined;
  }

  // CSRF token is also captured at render time. Both `provideCsrfToken`
  // paths (server + client) seed it outside the submit handler's scope,
  // so reading it eagerly matches how we read FormContext above.
  const csrfToken = useCsrfToken();
  const csrfEnabled = props.csrf !== false;

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
    'csrf',
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

  // Inject the hidden CSRF input *before* user children so the form
  // data order matches what a user would have written by hand. Skipped
  // when no token is in context (plain SPA / standalone use) or the
  // caller opted out.
  if (csrfEnabled && csrfToken) {
    const hidden = document.createElement('input');
    hidden.setAttribute('type', 'hidden');
    hidden.setAttribute('name', CSRF_FORM_FIELD);
    hidden.setAttribute('value', csrfToken);
    form.appendChild(hidden);
  }

  appendChildren(form, props.children);

  // Only install the enhancement hook when a live `window.fetch` is
  // available and we have a kit context to feed the submit path. On
  // the server we're building markup, not handling events; outside
  // mount() there's nothing to update, so in both cases we let the
  // browser submit the form natively.
  if (typeof window !== 'undefined' && !props.reloadDocument && ctx) {
    const capturedCtx = ctx;
    const capturedCsrf = csrfEnabled ? csrfToken : undefined;
    form.addEventListener('submit', (event) => {
      if (props.onSubmit) {
        props.onSubmit(event as SubmitEvent);
        if (event.defaultPrevented) return;
      }
      // Delegate to the enhanced submit path. It calls preventDefault()
      // itself so the browser doesn't also do a native submit.
      void enhancedSubmit(form, event as SubmitEvent, capturedCtx, capturedCsrf);
    });
  }

  return form;
}

async function enhancedSubmit(
  form: HTMLFormElement,
  event: SubmitEvent,
  ctx: FormContextValue,
  csrfToken: string | undefined,
): Promise<void> {
  event.preventDefault();

  const { router, actionStore, loaderStore } = ctx;
  const method = (form.method || 'post').toUpperCase();
  const actionUrl = form.getAttribute('action') || router.route().path;

  // Build the body from the form itself so the encoding matches what
  // a native submission would have produced. Using a fresh FormData
  // also picks up any programmatic changes the onSubmit handler made.
  const formData = new FormData(form);

  // Duplicate the token onto a header as well. The server accepts
  // either, so if the hidden input was stripped by an earlier handler
  // or the form was assembled without `<Form>`'s injection path, the
  // header still carries the proof-of-same-origin.
  const submitHeaders: Record<string, string> = {
    Accept: 'application/json',
    [FORM_SUBMIT_HEADER]: '1',
  };
  if (csrfToken) submitHeaders[CSRF_HEADER] = csrfToken;

  let response: Response;
  try {
    response = await fetch(actionUrl, {
      method,
      body: formData,
      headers: submitHeaders,
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

  // The server hands back already-tagged entries ({ data } or { error });
  // the store's `set()` helpers would wrap them a second time, so pick
  // the right branch and pass the unwrapped payload through. A restored
  // Error instance round-trips through setError()'s serializer so the
  // stored shape matches every other error path.
  if (payload.actionData) {
    for (const [fullPath, entry] of Object.entries(payload.actionData)) {
      if (entry && typeof entry === 'object' && 'error' in entry) {
        const e = (entry as { error: { message: string; name: string } }).error;
        const err = new Error(e.message);
        err.name = e.name;
        actionStore.setError(fullPath, err);
      } else {
        actionStore.set(
          fullPath,
          (entry as { data: unknown } | undefined)?.data,
        );
      }
    }
  }
  if (payload.loaderData) {
    for (const [fullPath, entry] of Object.entries(payload.loaderData)) {
      if (entry && typeof entry === 'object' && 'error' in entry) {
        const e = (entry as { error: { message: string; name: string } }).error;
        const err = new Error(e.message);
        err.name = e.name;
        loaderStore.setError(fullPath, err);
      } else {
        loaderStore.set(
          fullPath,
          (entry as { data: unknown } | undefined)?.data,
        );
      }
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
