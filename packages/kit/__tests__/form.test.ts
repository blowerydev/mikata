import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _createComponent } from '@mikata/runtime';
import { mount } from '../src/client';
import { Form, FORM_SUBMIT_HEADER } from '../src/form';
import { LOADER_DATA_GLOBAL, useLoaderData } from '../src/loader';
import { ACTION_DATA_GLOBAL, useActionData } from '../src/action';
import { CSRF_GLOBAL, CSRF_FORM_FIELD, CSRF_HEADER } from '../src/csrf';
import type { Router } from '@mikata/router';

// Poll a predicate — mount()'s lazy routes resolve asynchronously,
// and the client's effects defer via queueMicrotask.
async function waitUntil(predicate: () => boolean, maxMs = 500): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > maxMs) throw new Error('waitUntil timeout');
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function waitForForm(container: HTMLElement): Promise<HTMLFormElement> {
  await waitUntil(() => container.querySelector('form') !== null);
  return container.querySelector('form') as HTMLFormElement;
}

function mockJsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

interface MountHandle {
  container: HTMLDivElement;
  router: Router;
  dispose: () => void;
  form(): HTMLFormElement | null;
}

// Mount a single-route app with `<Form>` at '/' so we don't need a
// navigation step before each test.
function mountForm(
  formProps: Record<string, unknown> = {},
  extraRender?: (readAction: <T>() => T | undefined) => Node,
): MountHandle {
  const Page = () => {
    const form = Form({
      method: 'post',
      action: '/',
      ...formProps,
      children: [
        (() => {
          const input = document.createElement('input');
          input.name = 'name';
          input.value = 'ada';
          return input;
        })(),
      ],
    });
    if (!extraRender) return form;
    const frag = document.createDocumentFragment();
    frag.appendChild(extraRender(useActionData));
    frag.appendChild(form);
    return frag;
  };
  const routes = [
    {
      path: '/',
      lazy: async () => ({ default: () => _createComponent(Page, {}) }),
    },
  ];
  const container = document.createElement('div');
  document.body.appendChild(container);
  const { dispose, router } = mount(routes, container, { history: 'memory' });
  return {
    container,
    router,
    dispose: () => {
      dispose();
      container.remove();
    },
    form: () => container.querySelector('form'),
  };
}

describe('<Form>', () => {
  let originalFetch: typeof fetch | undefined;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
    delete (window as any)[LOADER_DATA_GLOBAL];
    delete (window as any)[ACTION_DATA_GLOBAL];
    // Pretend the server primed the CSRF global the way renderRoute would.
    // Individual tests can `delete` it to exercise the no-provider path.
    (window as any)[CSRF_GLOBAL] = 'z'.repeat(32);
  });

  afterEach(() => {
    if (originalFetch) {
      (globalThis as any).fetch = originalFetch;
    } else {
      delete (globalThis as any).fetch;
    }
    delete (window as any)[CSRF_GLOBAL];
  });

  describe('rendering', () => {
    it('renders a <form> with method/enctype/action as attributes', async () => {
      const h = mountForm({ method: 'post', action: '/submit' });
      const form = await waitForForm(h.container);
      expect(form.getAttribute('method')).toBe('post');
      expect(form.getAttribute('enctype')).toBe('application/x-www-form-urlencoded');
      expect(form.getAttribute('action')).toBe('/submit');
      h.dispose();
    });

    it('defaults method to post and enctype to x-www-form-urlencoded', async () => {
      const h = mountForm();
      const form = await waitForForm(h.container);
      expect(form.getAttribute('method')).toBe('post');
      expect(form.getAttribute('enctype')).toBe('application/x-www-form-urlencoded');
      h.dispose();
    });

    it('honours a custom enctype for multipart uploads', async () => {
      const h = mountForm({ encType: 'multipart/form-data' });
      const form = await waitForForm(h.container);
      expect(form.getAttribute('enctype')).toBe('multipart/form-data');
      h.dispose();
    });

    it('forwards arbitrary attributes (class, id, aria-*) to the <form>', async () => {
      const h = mountForm({
        class: 'contact-form',
        id: 'main',
        'aria-label': 'contact',
      });
      const form = await waitForForm(h.container);
      expect(form.getAttribute('class')).toBe('contact-form');
      expect(form.getAttribute('id')).toBe('main');
      expect(form.getAttribute('aria-label')).toBe('contact');
      h.dispose();
    });

    it('renders children inside the form', async () => {
      const h = mountForm();
      const form = await waitForForm(h.container);
      expect(form.querySelector('input[name="name"]')).not.toBeNull();
      h.dispose();
    });
  });

  describe('enhanced submit', () => {
    it('fetches the action URL with method + form header + body', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));
      const h = mountForm({ method: 'post', action: '/submit' });
      const form = await waitForForm(h.container);

      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await waitUntil(() => fetchMock.mock.calls.length === 1);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/submit');
      expect(init.method).toBe('POST');
      expect(init.headers.Accept).toBe('application/json');
      expect(init.headers[FORM_SUBMIT_HEADER]).toBe('1');
      expect(init.body).toBeInstanceOf(FormData);
      expect((init.body as FormData).get('name')).toBe('ada');

      h.dispose();
    });

    it('falls back to the current route path when action prop is absent', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));
      const h = mountForm({ method: 'post', action: undefined });
      const form = await waitForForm(h.container);

      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await waitUntil(() => fetchMock.mock.calls.length === 1);

      expect(fetchMock.mock.calls[0][0]).toBe('/');
      h.dispose();
    });

    it('calls preventDefault so the browser does not also submit', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));
      const h = mountForm();
      const form = await waitForForm(h.container);

      const event = new Event('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(event);
      await waitUntil(() => fetchMock.mock.calls.length === 1);
      expect(event.defaultPrevented).toBe(true);

      h.dispose();
    });

    it('writes JSON actionData into the store so useActionData() updates', async () => {
      fetchMock.mockResolvedValue(
        mockJsonResponse({
          actionData: { '/': { data: { ok: true } } },
        }),
      );

      // Inline setup: inside the Page component we can call
      // useActionData() and close over it in a live accessor on the DOM
      // node, then poll from the test without needing a full reactive
      // render pipeline on the text node.
      const Page = () => {
        const result = useActionData<() => Promise<{ ok: boolean }>>();
        const frag = document.createDocumentFragment();
        const status = document.createElement('span') as HTMLElement & {
          __read: () => string;
        };
        status.setAttribute('class', 'status');
        status.__read = () => (result() ? 'saved' : 'idle');
        const form = Form({
          method: 'post',
          action: '/',
          children: [],
        });
        frag.appendChild(status);
        frag.appendChild(form);
        return frag;
      };

      const routes = [
        {
          path: '/',
          lazy: async () => ({ default: () => _createComponent(Page, {}) }),
        },
      ];
      const container = document.createElement('div');
      document.body.appendChild(container);
      const { dispose } = mount(routes, container, { history: 'memory' });

      const form = await waitForForm(container);
      const status = container.querySelector('.status') as HTMLElement & {
        __read: () => string;
      };
      expect(status.__read()).toBe('idle');

      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await waitUntil(() => status.__read() === 'saved');

      dispose();
      container.remove();
    });

    it('writes loaderData from the JSON payload so useLoaderData() updates', async () => {
      fetchMock.mockResolvedValue(
        mockJsonResponse({
          loaderData: { '/': { data: { count: 5 } } },
        }),
      );

      const Page = () => {
        const data = useLoaderData<() => Promise<{ count: number }>>();
        const frag = document.createDocumentFragment();
        const status = document.createElement('span') as HTMLElement & {
          __read: () => number | undefined;
        };
        status.setAttribute('class', 'status');
        status.__read = () => data()?.count;
        const form = Form({
          method: 'post',
          action: '/',
          children: [],
        });
        frag.appendChild(status);
        frag.appendChild(form);
        return frag;
      };

      const routes = [
        {
          path: '/',
          lazy: async () => ({ default: () => _createComponent(Page, {}) }),
        },
      ];
      const container = document.createElement('div');
      document.body.appendChild(container);
      const { dispose } = mount(routes, container, { history: 'memory' });

      const form = await waitForForm(container);
      const status = container.querySelector('.status') as HTMLElement & {
        __read: () => number | undefined;
      };

      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await waitUntil(() => status.__read() === 5);

      dispose();
      container.remove();
    });

    it('follows a redirect payload via router.navigate', async () => {
      fetchMock.mockResolvedValue(
        mockJsonResponse({ redirect: { url: '/thanks', status: 303 } }),
      );

      // Second route catches the navigation. Memory history means
      // router.navigate resolves locally without touching the real URL.
      const FormPage = () =>
        Form({
          method: 'post',
          action: '/',
          children: [],
        });
      const ThanksPage = () => {
        const p = document.createElement('p');
        p.textContent = 'thanks!';
        return p;
      };
      const routes = [
        {
          path: '/',
          lazy: async () => ({ default: () => _createComponent(FormPage, {}) }),
        },
        {
          path: '/thanks',
          lazy: async () => ({ default: () => _createComponent(ThanksPage, {}) }),
        },
      ];
      const container = document.createElement('div');
      document.body.appendChild(container);
      const { dispose, router } = mount(routes, container, { history: 'memory' });

      const form = await waitForForm(container);
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await waitUntil(() => router.route().path === '/thanks');

      dispose();
      container.remove();
    });

    it('reports fetch failures via actionStore.setError for the leaf route', async () => {
      fetchMock.mockRejectedValue(new Error('offline'));

      const Page = () => {
        const result = useActionData();
        const frag = document.createDocumentFragment();
        const status = document.createElement('span') as HTMLElement & {
          __peek: () => string;
        };
        status.setAttribute('class', 'status');
        status.__peek = () => {
          try {
            return String((result as any)() ?? 'idle');
          } catch (err) {
            return (err as Error).message;
          }
        };
        const form = Form({
          method: 'post',
          action: '/',
          children: [],
        });
        frag.appendChild(status);
        frag.appendChild(form);
        return frag;
      };

      const routes = [
        {
          path: '/',
          lazy: async () => ({ default: () => _createComponent(Page, {}) }),
        },
      ];
      const container = document.createElement('div');
      document.body.appendChild(container);
      const { dispose } = mount(routes, container, { history: 'memory' });

      const form = await waitForForm(container);
      const status = container.querySelector('.status') as HTMLElement & {
        __peek: () => string;
      };

      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await waitUntil(() => status.__peek() === 'offline');

      dispose();
      container.remove();
    });
  });

  describe('escape hatches', () => {
    it('reloadDocument lets the browser handle the submit natively', async () => {
      const h = mountForm({ reloadDocument: true });
      const form = await waitForForm(h.container);

      // jsdom does not implement form submission, but the listener
      // either runs (and calls fetch) or it doesn't. We rely on the
      // fetch-not-called assertion + the event not being prevented.
      const event = new Event('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(event);
      await new Promise((r) => setTimeout(r, 20));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);

      h.dispose();
    });

    it('onSubmit preventDefault cancels the enhanced submit entirely', async () => {
      const onSubmit = vi.fn((e: SubmitEvent) => {
        e.preventDefault();
      });
      const h = mountForm({ onSubmit });
      const form = await waitForForm(h.container);

      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();

      h.dispose();
    });

    it('onSubmit without preventDefault still allows the enhanced submit', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));
      const onSubmit = vi.fn();
      const h = mountForm({ onSubmit });
      const form = await waitForForm(h.container);

      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await waitUntil(() => fetchMock.mock.calls.length === 1);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      h.dispose();
    });
  });

  describe('CSRF protection', () => {
    it('injects a hidden _csrf input populated from the window global', async () => {
      const h = mountForm();
      const form = await waitForForm(h.container);
      const hidden = form.querySelector(
        `input[name="${CSRF_FORM_FIELD}"]`,
      ) as HTMLInputElement | null;
      expect(hidden).not.toBeNull();
      expect(hidden!.getAttribute('type')).toBe('hidden');
      expect(hidden!.getAttribute('value')).toBe('z'.repeat(32));
      h.dispose();
    });

    it('omits the hidden input when no CSRF global is present', async () => {
      delete (window as any)[CSRF_GLOBAL];
      const h = mountForm();
      const form = await waitForForm(h.container);
      expect(form.querySelector(`input[name="${CSRF_FORM_FIELD}"]`)).toBeNull();
      h.dispose();
    });

    it('omits the hidden input when `csrf={false}` is set', async () => {
      const h = mountForm({ csrf: false });
      const form = await waitForForm(h.container);
      expect(form.querySelector(`input[name="${CSRF_FORM_FIELD}"]`)).toBeNull();
      h.dispose();
    });

    it('sets the X-Mikata-CSRF header on enhanced submits', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));
      const h = mountForm({ method: 'post', action: '/submit' });
      const form = await waitForForm(h.container);

      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await waitUntil(() => fetchMock.mock.calls.length === 1);

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers[CSRF_HEADER]).toBe('z'.repeat(32));
      h.dispose();
    });

    it('omits the CSRF header when the form opts out', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));
      const h = mountForm({ method: 'post', action: '/submit', csrf: false });
      const form = await waitForForm(h.container);

      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await waitUntil(() => fetchMock.mock.calls.length === 1);

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers[CSRF_HEADER]).toBeUndefined();
      h.dispose();
    });
  });
});
