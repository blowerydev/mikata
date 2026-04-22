# Mikata

A reactive UI framework for the web. Signals for state, JSX compiled to real DOM operations (no virtual DOM), and components that run exactly once.

```tsx
import { signal, computed, render, show, each } from 'mikata';

function TodoList() {
  const [todos, setTodos] = signal<{ id: number; text: string; done: boolean }[]>([]);
  const [input, setInput] = signal('');
  const remaining = computed(() => todos().filter((t) => !t.done).length);

  const add = () => {
    if (!input().trim()) return;
    setTodos([...todos(), { id: Date.now(), text: input(), done: false }]);
    setInput('');
  };

  const toggle = (id: number) =>
    setTodos(todos().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div>
      <input
        value={input()}
        onInput={(e) => setInput(e.currentTarget.value)}
        onKeydown={(e) => e.key === 'Enter' && add()}
      />
      <button onClick={add}>Add</button>

      <ul>
        {each(todos, (todo) => (
          <li
            style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
            onClick={() => toggle(todo.id)}
          >
            {todo.text}
          </li>
        ))}
      </ul>

      {show(
        () => todos().length > 0,
        () => <p>{remaining()} remaining</p>
      )}
    </div>
  );
}

render(() => <TodoList />, document.getElementById('app')!);
```

### Form bindings — two styles

Native form events are typed against the element they're attached to, so `e.currentTarget.value` is typed for you — no `as HTMLInputElement` dance:

```tsx
<input value={name()} onInput={(e) => setName(e.currentTarget.value)} />
<input type="checkbox" checked={agree()} onChange={(e) => setAgree(e.currentTarget.checked)} />
```

For the common case, `model()` is shorter still — one spread wires up value + handler + coercion:

```tsx
import { model } from 'mikata';

<input {...model(name, setName)} />
<input type="number" {...model(age, setAge, 'number')} />
<input type="checkbox" {...model(agree, setAgree, 'checkbox')} />
<select {...model(color, setColor, 'select')}>…</select>
```

### With `@mikata/ui`

`@mikata/ui` components are plain JSX - same signals, same fine-grained updates, no extra ceremony.

```tsx
import { signal, render } from 'mikata';
import {
  ThemeProvider,
  Button,
  TextInput,
  Stack,
  Title,
  Switch,
  Badge,
} from '@mikata/ui';
import '@mikata/ui/styles.css';

function SignupCard() {
  const [email, setEmail] = signal('');
  const [subscribed, setSubscribed] = signal(false);
  const isValid = () => /@/.test(email());

  return (
    <Stack gap="md">
      <Title order={2}>Join the beta</Title>
      <TextInput
        label="Email"
        placeholder="you@example.com"
        value={email()}
        onInput={(e) => setEmail(e.currentTarget.value)}
      />
      <Switch
        label="Subscribe to updates"
        checked={subscribed()}
        onChange={(e) => setSubscribed(e.currentTarget.checked)}
      />
      <Button disabled={!isValid()}>Sign up</Button>
      {isValid() && <Badge color="green">Looks good</Badge>}
    </Stack>
  );
}

render(
  () => (
    <ThemeProvider>
      <SignupCard />
    </ThemeProvider>
  ),
  document.getElementById('app')!
);
```

## Server rendering

`@mikata/server` renders a component tree to HTML on the server; `hydrate()` adopts that HTML on the client without rebuilding the DOM. The same compiled runtime drives both sides — there is no separate server backend.

```tsx
// entry-server.tsx
import { renderToString } from '@mikata/server';
import { App } from './App';

const { html, stateScript } = await renderToString(() => <App />);
// inline `html` into your shell and emit `stateScript` before your client entry
```

```tsx
// entry-client.tsx
import { hydrate } from '@mikata/runtime';
import { App } from './App';

hydrate(() => <App />, document.getElementById('root')!);
```

`createQuery` calls are collected during SSR, awaited, and their results serialised into `window.__MIKATA_STATE__`. On the client, matching queries seed from that payload automatically — no developer wiring.

For file-based routing, `@mikata/kit` ships a Vite plugin with a dev-mode SSR middleware. Put files under `src/routes/`, add the plugin, and every request is SSR'd and upgraded to client routing after hydrate:

```ts
// vite.config.ts
import { mikata } from '@mikata/compiler';
import { mikataKit } from '@mikata/kit';

export default { plugins: [mikata(), mikataKit()] };
```

Routing conventions: `index.tsx` → parent path, `[id].tsx` → `:id`, `[...rest].tsx` → catch-all, `_layout.tsx` → nested layout. Route modules can export `load(ctx)` to fetch data server-side; `useLoaderData()` returns the seeded value during hydration. See `examples/kit-ssr/` for a runnable app.

Production ships three deploy targets:

- **Node** — `@mikata/kit/adapter-node` exposes `createRequestHandler()`, a zero-dependency `(req, res) => Promise<void>` wired against `dist/client/` + `dist/server/` from the two Vite build passes.
- **Edge / Workers** — `@mikata/kit/adapter-edge` exposes `createFetchHandler()`, a web-standard `(request: Request) => Promise<Response>` for Cloudflare Workers, Deno Deploy, Vercel Edge, Netlify Edge, Bun.serve — anywhere a Fetch handler is the native entry.
- **Static (SSG)** — `@mikata/kit/prerender` (or `mikataKit({ prerender: true })`) walks the route tree, expands parametric routes via each route's `getStaticPaths` export, renders every URL through the Fetch handler, copies client assets in, and writes a drop-in static site to `dist/static/`. Missing `getStaticPaths` on a `:param` route fails the build by default.

Full patterns, options, and gotchas for all three in `llms.txt`.

## Why

- **No virtual DOM.** JSX compiles to direct `createElement` / `textContent` operations. A signal change updates exactly the text node or attribute that reads it - no diffing, no reconciliation pass.
- **Components run once.** A component is a setup function that wires up reactive bindings and returns DOM nodes. It never re-runs. Your `console.log` at the top fires exactly one time, forever.
- **Fine-grained reactivity.** Signals track reads automatically. An effect that reads `count()` re-runs only when `count` changes - not when the parent "renders."
- **Functions over components for control flow.** `show`, `each`, `switchMatch`, `portal`, `transition`, `routeOutlet` - all plain functions you call in JSX, not special elements the framework has to interpret.

## Quick start

```bash
pnpm create mikata my-app             # interactive prompts
pnpm create mikata my-app --template full   # everything: router, UI, i18n, forms, store, testing, ESLint
pnpm create mikata my-app --router --ui --icons  # pick features à la carte
```

Available features: `router`, `ui`, `icons`, `form`, `i18n`, `store`, `testing`, `eslint`, `tailwind`. See `packages/create-mikata/` for the full flag list.

## Packages

| Package | What it does |
|---|---|
| `mikata` | Umbrella - re-exports the runtime, reactivity, store, router, i18n, form, and icons |
| `@mikata/reactivity` | Signals, computed, reactive proxies, effects, scopes |
| `@mikata/runtime` | DOM rendering, setup pattern, control flow, context, transitions, `hydrate()` |
| `@mikata/compiler` | Vite plugin that lowers JSX to DOM operations |
| `@mikata/server` | `renderToString()` + DOM shim for SSR; awaits pending queries and emits a hydration state script |
| `@mikata/kit` | File-based routing, Vite plugin, and dev-mode SSR middleware built on `@mikata/router` + `@mikata/server` |
| `@mikata/ui` | 80+ headless-optional components (Button, Modal, DataTable, DatePicker, …) |
| `@mikata/router` | Client-side routing with typed search params and nested layouts |
| `@mikata/store` | Reactive stores, queries, mutations, tag-based cache invalidation |
| `@mikata/persist` | Storage-backed signals (localStorage/sessionStorage/IndexedDB) with cross-tab sync |
| `@mikata/i18n` | Locale switching, ICU messages, reactive translations |
| `@mikata/form` | Form state, validation, schema resolvers (zod, yup, valibot) |
| `@mikata/icons` | Icon factory + Lucide/Tabler interop + built-in SVG set |
| `@mikata/testing` | `renderComponent`, `fireEvent`, `flushSync` helpers for Vitest |
| `@mikata/eslint-plugin` | Lint rules for the setup-runs-once model |
| `create-mikata` | Project scaffolder (this is what `pnpm create mikata` runs) |

Install individually (`pnpm add @mikata/runtime @mikata/reactivity`) or all at once (`pnpm add mikata`).

## Development

```bash
pnpm install
pnpm -r build                  # build every package
pnpm test:run                  # run the full test suite
pnpm dev                       # launch the playground (live demo of every package)
pnpm dev:ssr                   # SSR smoke harness (raw @mikata/server)
pnpm dev:kit                   # launch the kit-ssr example (file-based routing + dev SSR)
pnpm --filter @mikata/ui dev   # watch-build a single package
```

Repo layout:

- `packages/*` - publishable packages
- `examples/*` - runnable example apps (`kit-ssr`, …)
- `playground/` - dev-only SPA wired to every package via `workspace:*`
- `integration/` - cross-package integration tests (`@mikata/integration-tests`, private)
- `docs/` - long-form docs (will grow into the docs site)

Requires Node 18+ and pnpm 10+.

## License

MIT © Brandon Lowery
