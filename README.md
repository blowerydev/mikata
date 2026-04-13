# Mikata

A reactive UI framework for the web. Signals for state, JSX compiled to real DOM operations (no virtual DOM), and components that run exactly once.

```tsx
import { signal, render } from 'mikata';

function Counter() {
  const [count, setCount] = signal(0);
  return (
    <button onClick={() => setCount(count() + 1)}>
      Clicked {count()} times
    </button>
  );
}

render(Counter, document.getElementById('app')!);
```

## Why

- **No virtual DOM.** JSX compiles to direct `createElement` / `textContent` operations. A signal change updates exactly the text node or attribute that reads it — no diffing, no reconciliation pass.
- **Components run once.** A component is a setup function that wires up reactive bindings and returns DOM nodes. It never re-runs. Your `console.log` at the top fires exactly one time, forever.
- **Fine-grained reactivity.** Signals track reads automatically. An effect that reads `count()` re-runs only when `count` changes — not when the parent "renders."
- **Functions over components for control flow.** `show`, `each`, `switchMatch`, `portal`, `transition`, `routeOutlet` — all plain functions you call in JSX, not special elements the framework has to interpret.

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
| `mikata` | Umbrella — re-exports the runtime, reactivity, store, router, i18n, form, and icons |
| `@mikata/reactivity` | Signals, computed, reactive proxies, effects, scopes |
| `@mikata/runtime` | DOM rendering, setup pattern, control flow, context, transitions |
| `@mikata/compiler` | Vite plugin that lowers JSX to DOM operations |
| `@mikata/ui` | 80+ headless-optional components (Button, Modal, DataTable, DatePicker, …) |
| `@mikata/router` | Client-side routing with typed search params and nested layouts |
| `@mikata/store` | Reactive stores, queries, mutations |
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
pnpm --filter @mikata/ui dev   # watch-build a single package
```

Repo layout:

- `packages/*` — publishable packages
- `playground/` — dev-only SPA wired to every package via `workspace:*`
- `integration/` — cross-package integration tests (`@mikata/integration-tests`, private)
- `docs/` — long-form docs (will grow into the docs site)

Requires Node 18+ and pnpm 10+.

## License

MIT © Brandon Lowery
