import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Actions & forms', section: 'App Framework', order: 5 };

const actionExample = await highlight(
  `// src/routes/contact.tsx
import { redirect, useActionData, type ActionContext } from '@mikata/kit/action';
import { Form } from '@mikata/kit/form';

export async function action({ request }: ActionContext) {
  const data = await request.formData();
  const email = String(data.get('email') ?? '');

  if (!email.includes('@')) {
    return { ok: false, fieldErrors: { email: 'Enter an email address.' } };
  }

  await messages.create({ email, body: String(data.get('body') ?? '') });
  return redirect('/contact?sent=1');
}

export default function Contact() {
  const result = useActionData<typeof action>();

  return (
    <Form method="post">
      <input name="email" aria-invalid={!!result()?.fieldErrors?.email} />
      <textarea name="body" />
      <button type="submit">Send</button>
    </Form>
  );
}`,
  'tsx',
);

const methodExample = await highlight(
  `<Form method="delete" action="/projects/123">
  <button type="submit">Delete project</button>
</Form>`,
  'tsx',
);

export default function Actions() {
  useMeta({
    title: 'Actions and forms - Mikata Kit',
    description: 'Handle mutations in Mikata Kit with route actions and Form.',
  });

  return (
    <article>
      <h1>Actions &amp; forms</h1>
      <p>
        Actions handle mutating route requests. A page route can export
        <code>action()</code>, and Kit calls the leaf route action for non-GET
        submissions before reloading matched loader data.
      </p>

      <h2>Route action</h2>
      <p>
        <code>ActionContext</code> gives the action the <code>Request</code>,
        route params, URL, and cookies. Return plain data for validation results
        or return a <code>Response</code> for lower-level control.
      </p>
      <CodeBlock html={actionExample} />

      <h2>Progressive forms</h2>
      <p>
        <code>&lt;Form&gt;</code> renders a real HTML form. With JavaScript
        loaded, it intercepts the submit, sends a fetch request, updates action
        and loader stores, and follows redirects through the router. Without
        JavaScript, the browser submits the form normally.
      </p>
      <CodeBlock html={methodExample} />

      <h2>Validation data</h2>
      <p>
        <code>useActionData&lt;typeof action&gt;()</code> returns a read signal
        for the latest result from the current route action. It is cleared on
        navigation so stale validation messages do not follow the user to a
        different page.
      </p>

      <h2>Redirects and cookies</h2>
      <p>
        Use <code>redirect('/path')</code> after successful mutations. Cookie
        writes queued through the action context are appended to the response,
        including redirect responses.
      </p>

      <h2>CSRF</h2>
      <p>
        Kit uses a double-submit CSRF token for page actions. The
        <code>Form</code> component injects the hidden token and sends the
        matching header for enhanced requests. API routes are separate and
        should apply their own protection when they accept browser credentials.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/loaders">Loaders</Link> covers the data refresh that
          follows successful submissions.
        </li>
        <li>
          <Link to="/app/sessions">Cookies, sessions, CSRF</Link> shows login
          and logout patterns.
        </li>
      </ul>
    </article>
  );
}
