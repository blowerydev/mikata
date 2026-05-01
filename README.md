# Mikata

A reactive UI framework for the web. Signals for state, JSX compiled to real DOM operations, and components that run exactly once.

**Docs:** [blowerydev.github.io/mikata](https://blowerydev.github.io/mikata/)

## Why Mikata

- **No virtual DOM.** JSX compiles to direct DOM operations.
- **Components run once.** Logic is set up once instead of re-running on every update.
- **Fine-grained reactivity.** Signals and computed values update only what changed.
- **Composable by default.** Control flow is done with functions like `show()` and `each()`.

## Quick start

```bash
pnpm create mikata my-app
pnpm create mikata my-app --template full
pnpm create mikata my-app --router --ui --icons
```

Available features include `router`, `ui`, `icons`, `form`, `i18n`, `store`, `testing`, `eslint`, and `tailwind`.

Install individual packages:

```bash
pnpm add @mikata/runtime @mikata/reactivity @mikata/compiler
```

Or install the umbrella package:

```bash
pnpm add mikata
```

## Example

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

## What's included

Mikata can be used as a small reactive runtime or as a fuller app stack.

- `mikata`: umbrella package that re-exports the most commonly used pieces
- Core: `@mikata/reactivity`, `@mikata/runtime`, `@mikata/compiler`
- App stack: `@mikata/router`, `@mikata/server`, `@mikata/kit`
- Extras: `@mikata/ui`, `@mikata/store`, `@mikata/persist`, `@mikata/i18n`, `@mikata/form`, `@mikata/icons`, `@mikata/testing`, `@mikata/eslint-plugin`
- Scaffolding: `create-mikata`

The docs site goes into package-level detail, SSR, routing, UI components, forms, and deployment patterns.

## Common use cases

- Build client-rendered apps with signals and direct DOM updates
- Add file-based routing and SSR with `@mikata/kit`
- Render on the server with `@mikata/server` and hydrate on the client
- Use `@mikata/ui` for prebuilt components that still feel like plain JSX

## Development

Requires Node 18+ and pnpm 10+.

```bash
pnpm install
pnpm build
pnpm test:run
pnpm dev
pnpm dev:ssr
pnpm dev:kit
pnpm --filter @mikata/ui dev
```

Repo layout:

- `packages/`: publishable packages
- `examples/`: runnable example apps
- `playground/`: dev-only app wired to workspace packages
- `integration/`: cross-package integration tests
- `apps/docs/`: source for the docs site

## License

MIT (c) Brandon Lowery
