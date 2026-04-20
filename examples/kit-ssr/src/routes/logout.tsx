/**
 * Demo logout: drops the session cookie and redirects home. Lives as
 * its own route (rather than a button on `/`) so the action can be a
 * dedicated POST-only endpoint — a GET to `/logout` just re-renders
 * the form and doesn't destructively mutate state.
 */

import { useMeta } from '@mikata/kit/head';
import { redirect, type ActionContext } from '@mikata/kit/action';
import { Form } from '@mikata/kit/form';
import { session } from '../session';

export async function action({ cookies }: ActionContext) {
  session.destroy(cookies);
  return redirect('/');
}

export default function Logout() {
  useMeta({ title: 'Log out — Mikata Kit SSR Example' });
  return (
    <section class="page">
      <h2>Log out</h2>
      <Form method="post">
        <button type="submit">Confirm log out</button>
      </Form>
    </section>
  );
}
