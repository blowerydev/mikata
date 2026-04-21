# @mikata/kit — SSR example

End-to-end reference for `@mikata/kit`: file-based routing, server-rendered pages, loaders, actions, API routes, signed sessions, CSRF protection, and a production Node adapter.

## Run it

From the repo root:

```bash
pnpm install
pnpm --filter @mikata/example-kit-ssr dev     # dev server (SSR + HMR)
```

Open http://localhost:5173. The home page renders on the server; once hydrated, navigation is client-side.

## Build for production

```bash
pnpm --filter @mikata/example-kit-ssr build   # emits dist/client + dist/server
pnpm --filter @mikata/example-kit-ssr start   # node server.js
```

`start` runs [`server.js`](./server.js), a ~15-line wrapper around `@mikata/kit/adapter-node` — no Express, no loader, no extra runtime.

## What's in here

| Path | Shows |
|---|---|
| [`src/routes/index.tsx`](./src/routes/index.tsx) | basic SSR'd page |
| [`src/routes/_layout.tsx`](./src/routes/_layout.tsx) | layout with a loader that reads the session |
| [`src/routes/users/[id].tsx`](./src/routes/users/[id].tsx) | dynamic params + server + client loader re-runs |
| [`src/routes/login.tsx`](./src/routes/login.tsx) | `action()` + `<Form>` + session commit + `redirect()` |
| [`src/routes/logout.tsx`](./src/routes/logout.tsx) | session destroy |
| [`src/routes/boom.tsx`](./src/routes/boom.tsx) | loader throws → `ErrorBoundary` |
| [`src/routes/contact.tsx`](./src/routes/contact.tsx) | action validation surfacing via `useActionData()` |
| [`src/routes/api/ping.ts`](./src/routes/api/ping.ts) | API route (no default export, `GET` handler) |
| [`src/routes/404.tsx`](./src/routes/404.tsx) | top-level not-found route |
| [`src/session.ts`](./src/session.ts) | signed-cookie session with `createSessionCookie` |
| [`src/entry-server.tsx`](./src/entry-server.tsx) | SSR entry (adapter calls `render(ctx)`) |
| [`src/entry-client.tsx`](./src/entry-client.tsx) | `mount()` wired to the virtual manifest |
| [`index.html`](./index.html) | template with the `<!--ssr-outlet-->` and `<!--mikata-head-->` markers |
| [`vite.config.ts`](./vite.config.ts) | `mikata()` (compiler) + `mikataKit()` (routes plugin + dev SSR) |

The full API reference lives in [`packages/kit/README.md`](../../packages/kit/README.md).
