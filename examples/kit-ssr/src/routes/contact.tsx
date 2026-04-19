import { ErrorBoundary, each, show } from '@mikata/runtime';
import { useMeta } from '@mikata/kit/head';
import { useLoaderData, type LoadContext } from '@mikata/kit/loader';
import {
  redirect,
  useActionData,
  type ActionContext,
} from '@mikata/kit/action';
import { Form } from '@mikata/kit/form';

// In-memory "database" so the demo has visible state without asking
// the user to wire up real persistence. Module scope keeps it alive
// across requests in a single dev process — good enough for a demo.
const messages: Array<{ id: number; name: string; body: string }> = [];
let nextId = 1;

export async function load(_ctx: LoadContext) {
  return { messages: [...messages] };
}

export async function action({ request }: ActionContext) {
  const form = await request.formData();
  const intent = form.get('_intent');

  if (intent === 'clear') {
    messages.length = 0;
    // Redirect so a page refresh doesn't offer to re-submit the form —
    // the classic POST-redirect-GET pattern. `redirect()` returns a
    // Response; the adapter forwards the Location header on a native
    // submit, or hands it to the client Form for router.navigate().
    return redirect('/contact');
  }

  const name = String(form.get('name') ?? '').trim();
  const body = String(form.get('body') ?? '').trim();
  if (!name || !body) {
    // Throw so useActionData()'s error path reaches the ErrorBoundary.
    // The thrown Error surfaces on the client identically to a loader
    // throw — same shape, same serialisation.
    throw new Error('Both a name and a message are required.');
  }

  messages.push({ id: nextId++, name, body });
  return { ok: true, savedAt: new Date().toISOString() };
}

export default function Contact() {
  const data = useLoaderData<typeof load>();
  useMeta({
    title: 'Contact — Mikata Kit SSR Example',
    description: 'Form actions demo.',
  });

  return (
    <section class="page">
      <h2>Contact</h2>
      <p>
        Submit the form to exercise <code>action()</code>. Progressive
        enhancement: works with JS off (full-page POST), and is
        intercepted via <code>fetch</code> when JS is on (stays SPA).
      </p>

      <ErrorBoundary fallback={(err) => (
        <p class="error">Oops: {err.message}</p>
      )}>
        <ActionStatus />
      </ErrorBoundary>

      <Form method="post">
        <p>
          <label>
            Name: <input name="name" required />
          </label>
        </p>
        <p>
          <label>
            Message: <input name="body" required />
          </label>
        </p>
        <button type="submit" name="_intent" value="send">
          Send
        </button>
      </Form>

      <h3>Messages</h3>
      {show(
        () => (data()?.messages ?? []).length > 0,
        () => (
          <ul>
            {each(
              () => data()?.messages ?? [],
              (m) => (
                <li>
                  <strong>{m.name}:</strong> {m.body}
                </li>
              ),
            )}
          </ul>
        ),
        () => <p><em>No messages yet.</em></p>,
      )}

      <Form method="post">
        <button type="submit" name="_intent" value="clear">
          Clear all
        </button>
      </Form>
    </section>
  );
}

// Broken out so the ErrorBoundary's render boundary sits around just
// the useActionData() read — a throw there flips the fallback without
// blanking the rest of the page.
function ActionStatus() {
  const result = useActionData<typeof action>();
  return (
    <p class="status">
      {result()?.ok ? `Saved at ${result()!.savedAt}.` : ''}
    </p>
  );
}
