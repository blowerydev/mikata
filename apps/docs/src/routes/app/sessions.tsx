import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Cookies, sessions, CSRF', section: 'App Framework', order: 8 };

const sessionExample = await highlight(
  `// src/session.ts
import { createSessionCookie } from '@mikata/kit/session';

export const sessionCookie = createSessionCookie<{
  userId: string;
}>({
  name: 'acme_session',
  secret: process.env.SESSION_SECRET!,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
  },
});`,
  'ts',
);

const loginExample = await highlight(
  `// src/routes/login.tsx
import { redirect, type ActionContext } from '@mikata/kit/action';
import { sessionCookie } from '../session';

export async function action({ request, cookies }: ActionContext) {
  const data = await request.formData();
  const user = await verifyLogin(data);

  if (!user) {
    return { ok: false, message: 'Invalid email or password.' };
  }

  sessionCookie.commit({ userId: user.id }, cookies);
  return redirect('/dashboard');
}`,
  'tsx',
);

const logoutExample = await highlight(
  `import { sessionCookie } from '../session';

export async function action({ cookies }: ActionContext) {
  sessionCookie.destroy(cookies);
  return redirect('/login');
}`,
  'tsx',
);

export default function Sessions() {
  useMeta({
    title: 'Cookies, sessions, and CSRF - Mikata Kit',
    description: 'Use Mikata Kit cookie helpers, signed sessions, and CSRF protection.',
  });

  return (
    <article>
      <h1>Cookies, sessions, CSRF</h1>
      <p>
        Kit exposes request-aware cookie helpers to loaders, actions, and API
        handlers. The session helper builds on those cookies with signed values
        for common login flows.
      </p>

      <h2>Cookies</h2>
      <p>
        The <code>cookies</code> handle supports <code>get</code>,
        <code>set</code>, <code>delete</code>, and outgoing queued writes.
        Reads come from the request snapshot. Writes are appended to the server
        response as <code>Set-Cookie</code> headers.
      </p>

      <h2>Signed sessions</h2>
      <p>
        <code>createSessionCookie()</code> signs JSON payloads with HMAC. Keep
        session payloads small, store only data you are comfortable sending to
        the browser, and prefer IDs over full user records.
      </p>
      <CodeBlock html={sessionExample} />

      <h2>Login action</h2>
      <p>
        Commit a session in an action, queue the cookie, then redirect. The
        helper also accepts an array of secrets so you can rotate signing keys
        while still reading older cookies.
      </p>
      <CodeBlock html={loginExample} />

      <h2>Logout action</h2>
      <p>
        Delete the cookie with the same path and domain options used when it was
        created, then redirect to a public page.
      </p>
      <CodeBlock html={logoutExample} />

      <h2>Server-only boundaries</h2>
      <p>
        The session helper uses Node crypto and should stay in server-only
        modules, loaders, actions, API routes, or server entries. HttpOnly
        cookies are intentionally invisible to browser-side loaders and client
        components.
      </p>

      <h2>CSRF</h2>
      <p>
        Page actions use a double-submit CSRF token. Kit issues a
        <code>mikata_csrf</code> cookie, <code>&lt;Form&gt;</code> adds a hidden
        <code>_csrf</code> field, and enhanced submissions send
        <code>X-Mikata-CSRF</code>. API routes are not covered by this automatic
        action protection.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/app/actions">Actions &amp; forms</Link> covers form
          submissions and redirects.
        </li>
        <li>
          <Link to="/app/api-routes">API routes</Link> shows server endpoints
          that can also read and write cookies.
        </li>
      </ul>
    </article>
  );
}
