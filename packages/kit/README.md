# @mikata/kit

File-based routing, server-rendered pages, loaders, actions, and API routes for Mikata. Built on `@mikata/router` (client routing) and `@mikata/server` (SSR).

Put files under `src/routes/`, add the Vite plugin, and every request is rendered on the server and upgraded to client routing after hydration. The same JSX works on both sides — kit just wires up the data layer, form handling, and the production HTTP handler.

## Install

```bash
pnpm add @mikata/kit @mikata/runtime @mikata/reactivity @mikata/router @mikata/server vite
```

A runnable reference app lives at [`examples/kit-ssr/`](../../examples/kit-ssr/).

## Quickstart

Four files plus your routes:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';
import { mikataKit } from '@mikata/kit';

export default defineConfig({ plugins: [mikata(), mikataKit()] });
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <!--mikata-head-->
</head>
<body>
  <div id="root"><!--ssr-outlet--></div>
  <script type="module" src="/src/entry-client.tsx"></script>
</body>
</html>
```

```tsx
// src/entry-client.tsx
import { mount } from '@mikata/kit/client';
import routes, { notFound } from 'virtual:mikata-routes';

mount(routes, document.getElementById('root')!, { notFound });
```

```tsx
// src/entry-server.tsx
import { renderRoute } from '@mikata/kit/server';
import routes, { notFound, apiRoutes } from 'virtual:mikata-routes';

export async function render(ctx: {
  url: string;
  request?: Request;
  cookieHeader?: string | null;
}) {
  return renderRoute(routes, { ...ctx, notFound });
}

export { apiRoutes };
```

`virtual:mikata-routes` is emitted by the plugin — it's your `src/routes/` tree as dynamic imports.

Run `pnpm dev` and the dev server renders each request on the server (loaders run, head tags splice in, CSRF cookie is issued) before handing off to the client.

## Routing conventions

```
src/routes/
├── index.tsx              →  /
├── about.tsx              →  /about
├── users/
│   └── [id].tsx           →  /users/:id
├── blog/
│   └── [...slug].tsx      →  /blog/*     (catch-all)
├── _layout.tsx            →  layout wrapping every sibling + descendant
├── 404.tsx                →  rendered for unmatched URLs (status 404)
└── api/
    └── ping.ts            →  GET /api/ping (API route — see below)
```

Files prefixed `_` are ignored (except `_layout.tsx`, which has special meaning). Route files are any of `.tsx`, `.jsx`, `.ts`, `.js`.

## Loaders

Any route module can export `load()`; it runs on the server before render, and again on the client each time the URL's params change. The resolved value is embedded in the HTML shell and read back automatically on hydrate.

```tsx
// src/routes/users/[id].tsx
import { useLoaderData, type LoadContext } from '@mikata/kit/loader';

export async function load({ params }: LoadContext) {
  const res = await fetch(`https://api.example.com/users/${params.id}`);
  return { user: await res.json() };
}

export default function User() {
  const data = useLoaderData<typeof load>();
  return <p>Hello, {data()?.user.name}!</p>;
}
```

`LoadContext` carries `{ params, url, cookies, request? }`. A thrown error surfaces through the nearest `ErrorBoundary`; the first-paint HTML still flushes with status 500.

## Actions + `<Form>`

Non-GET requests to a page route invoke its `action()` export. `<Form>` is a plain `<form method="post">` — without JS, the browser submits natively; with JS, kit intercepts, POSTs as `fetch`, and updates loader + action stores in place.

```tsx
// src/routes/login.tsx
import { Form } from '@mikata/kit/form';
import { redirect, useActionData, type ActionContext } from '@mikata/kit/action';

export async function action({ request, cookies }: ActionContext) {
  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  // ...sign a session cookie, etc.
  return redirect('/');
}

export default function Login() {
  const result = useActionData<typeof action>();
  return (
    <Form method="post">
      <input name="name" required />
      <button type="submit">Log in</button>
      {result()?.error ? (
        <p class="error">{result()!.error.message}</p>
      ) : null}
    </Form>
  );
}
```

`redirect(url, status?)` returns a `Response` with a `Location` header — the adapter converts it to an HTTP 302 (or your chosen status). Action data clears automatically on navigation, so the next page doesn't see a stale submit.

## API routes

A route file with **no default export** and at least one of `GET / POST / PUT / PATCH / DELETE` becomes an API route. Path rules are identical to page routes; layouts don't apply.

```ts
// src/routes/api/users/[id].ts
import type { ApiContext } from '@mikata/kit/api';

export async function GET({ params }: ApiContext): Promise<Response> {
  return Response.json({ id: params.id });
}
```

The plugin classifies API vs page routes automatically — your `entry-server.tsx` re-exports `apiRoutes` and kit's adapter dispatches them before touching the renderer.

## Cookies & sessions

`LoadContext`, `ActionContext`, and `ApiContext` all carry a `cookies` handle backed by the raw inbound `Cookie:` header:

```ts
cookies.get('theme');                         // string | undefined
cookies.set('theme', 'dark', { path: '/' });  // queues a Set-Cookie
cookies.delete('theme');                      // queues a Max-Age=0 cookie
```

For signed, tamper-evident sessions, `@mikata/kit/session` wraps HMAC-SHA256 around a JSON payload:

```ts
// src/session.ts
import { createSessionCookie } from '@mikata/kit/session';

export const session = createSessionCookie<{ userId: string }>({
  name: 'sid',
  secret: process.env.SESSION_SECRET!,
  cookie: { path: '/', httpOnly: true, sameSite: 'lax', secure: true },
});
```

```ts
session.commit({ userId: 'u1' }, cookies); // queues signed Set-Cookie
session.read(cookies);                      // { userId: 'u1' } | undefined
session.destroy(cookies);                   // queues Max-Age=0
```

The real implementation uses `node:crypto` and only runs on the server. Client bundles resolve to a no-op stub via a package export condition — HttpOnly session cookies are invisible to `document.cookie` anyway, so there's nothing useful to do client-side.

Rotate secrets by passing an array: the first entry signs new cookies, every entry is accepted on read.

## CSRF

Automatic. On every render, kit issues an HttpOnly `mikata_csrf` cookie and embeds the token both in a window global and in `<Form>`. On any non-GET, the server compares the submitted token (form field `_csrf` or `X-Mikata-CSRF` header) against the cookie — mismatch → 403. No manual wiring.

Opt out per-form for public webhook endpoints:

```tsx
<Form method="post" csrf={false}>…</Form>
```

API routes are **not** CSRF-protected — their auth model is different (Bearer tokens, API keys) and a cookie handshake would break non-browser clients.

## Head management

`useMeta()` declaratively sets `<title>`, `<meta>`, `<link>` — collected server-side, spliced into the template at `<!--mikata-head-->`, and reconciled client-side on navigation.

```tsx
import { useMeta } from '@mikata/kit/head';

export default function UserDetail() {
  const data = useLoaderData<typeof load>();
  useMeta(() => ({
    title: `${data()?.user.name} — Users`,
    description: `Profile for ${data()?.user.name}.`,
    meta: [{ property: 'og:type', content: 'profile' }],
  }));
  // ...
}
```

Pass a function (reactive) or an object (static). Child routes override parent tags by key.

## Production

Build client + server bundles, then serve with the zero-dependency Node adapter:

```jsonc
// package.json
{
  "scripts": {
    "build": "vite build --outDir dist/client && vite build --ssr src/entry-server.tsx --outDir dist/server",
    "start": "node server.js"
  }
}
```

```js
// server.js
import { createServer } from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from '@mikata/kit/adapter-node';
import * as serverEntry from './dist/server/entry-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const handler = createRequestHandler({
  clientDir: path.join(__dirname, 'dist/client'),
  serverEntry,
});

createServer(handler).listen(Number(process.env.PORT) || 3000);
```

The adapter serves hashed Vite assets from `dist/client/`, dispatches API routes, then falls through to SSR for page routes. `req` / `res` are plain `node:http` — drop the handler into Express/Fastify as middleware if you need extras.

## Subpath reference

Every concern lives on its own export so bundlers can split cleanly between Vite config, browser, and Node.

| Subpath | Use in | Key exports |
|---|---|---|
| `@mikata/kit` | `vite.config.ts` | `mikataKit` (Vite plugin), `scanRoutes` |
| `@mikata/kit/client` | `entry-client.tsx` | `mount`, `ErrorBoundary` |
| `@mikata/kit/server` | `entry-server.tsx` | `renderRoute` |
| `@mikata/kit/adapter-node` | `server.js` | `createRequestHandler` |
| `@mikata/kit/loader` | route files | `useLoaderData`, `LoadContext` |
| `@mikata/kit/action` | route files | `useActionData`, `redirect`, `ActionContext` |
| `@mikata/kit/form` | route files | `Form` |
| `@mikata/kit/api` | API route files | `ApiContext`, `ApiHandler` |
| `@mikata/kit/cookies` | route files | `createCookies`, `CookieOptions` |
| `@mikata/kit/session` | shared session helper | `createSessionCookie` |
| `@mikata/kit/csrf` | custom forms | `useCsrfToken`, `CSRF_FORM_FIELD`, `CSRF_HEADER` |
| `@mikata/kit/csrf-server` | custom server hooks | `generateCsrfToken`, `verifyCsrfFromRequest` |
| `@mikata/kit/head` | route files | `useMeta` |

## License

MIT © Brandon Lowery
