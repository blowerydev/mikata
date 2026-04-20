/**
 * Demo login: sets a signed session cookie on POST, redirects home.
 *
 * There's no real password check — the example's goal is to exercise
 * `action()` + cookies + session end-to-end, not model real auth. In
 * production you'd verify the password against a hash, rate-limit
 * failed attempts, etc.
 */

import { useMeta } from '@mikata/kit/head';
import {
  redirect,
  useActionData,
  type ActionContext,
} from '@mikata/kit/action';
import { Form } from '@mikata/kit/form';
import { session } from '../session';

export async function action({ request, cookies }: ActionContext) {
  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  session.commit({ userId: 'demo', name }, cookies);
  return redirect('/');
}

export default function Login() {
  useMeta({ title: 'Log in — Mikata Kit SSR Example' });
  const result = useActionData<typeof action>();
  return (
    <section class="page">
      <h2>Log in</h2>
      <p>
        Enter any name — the demo signs it into a cookie and redirects
        home. Refresh the page to confirm the session sticks.
      </p>
      <Form method="post">
        <p>
          <label>
            Name: <input name="name" required />
          </label>
        </p>
        <button type="submit">Log in</button>
      </Form>
      {result()?.error ? (
        <p class="error">Oops: {result()!.error.message}</p>
      ) : null}
    </section>
  );
}
