# Mikata Framework Overview

Mikata is a reactive UI framework for building web applications. It compiles JSX to direct DOM operations (no virtual DOM), uses fine-grained signals for reactivity, and runs component functions exactly once.

## Why Mikata?

- **No virtual DOM** -- JSX compiles to real `createElement` calls. When state changes, only the specific text node or attribute updates. No diffing, no reconciliation.
- **Components run once** -- A component is a setup function. It creates DOM nodes and sets up reactive bindings, then never runs again.
- **Fine-grained reactivity** -- Signals track dependencies automatically. An effect that reads `count()` only re-runs when `count` changes, not when anything else in the component changes.
- **Functions over components** -- Control flow (`show`, `each`, `switchMatch`, `portal`, `transition`) and routing (`routeOutlet`) are plain functions, not special components.

---

## Reactivity

Signals are the core primitive. They return a `[getter, setter]` tuple:

```tsx
import { signal, computed, effect } from 'mikata';

const [count, setCount] = signal(0);

// Computed values are lazy and cached
const doubled = computed(() => count() * 2);

// Effects auto-track dependencies and re-run when they change
effect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

setCount(5); // logs "Count: 5, Doubled: 10"
```

For objects, use `reactive()` -- a deep proxy that tracks reads and writes at the property level:

```tsx
import { reactive } from 'mikata';

const state = reactive({ user: { name: 'Alice' }, items: [] });
state.user.name = 'Bob';    // triggers only effects reading state.user.name
state.items.push('hello');   // triggers effects reading state.items
```

---

## Components

Components are plain functions that return DOM nodes. They run once:

```tsx
function Counter() {
  const [count, setCount] = signal(0);

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}
```

The compiler transforms the JSX into direct DOM operations. `{count()}` becomes a reactive text node that updates when `count` changes -- the `Counter` function itself is never called again.

---

## Control Flow

Control flow uses functions, not components or special syntax:

```tsx
import { show, each, switchMatch } from 'mikata';

// Conditional rendering
show(
  () => user(),
  (user) => <Profile user={user} />,
  () => <LoginPage />
);

// List rendering with keyed reconciliation
each(
  () => items(),
  (item, index) => <Card item={item} position={index()} />,
  () => <p>No items</p>,
  { key: (item) => item.id }
);

// Pattern matching
switchMatch(
  () => status(),
  {
    loading: () => <Spinner />,
    error: () => <ErrorMessage />,
    success: () => <Results />,
  }
);
```

---

## Context (Dependency Injection)

Pass data through the component tree without prop drilling:

```tsx
import { createContext, provide, inject } from 'mikata';

const ThemeContext = createContext<'light' | 'dark'>('light');

function App() {
  provide(ThemeContext, 'dark');
  return <Dashboard />;
}

function ThemedButton() {
  const theme = inject(ThemeContext); // 'dark'
  return <button class={`btn-${theme}`}>Click me</button>;
}
```

---

## Store

Higher-level state management with reactive stores, async queries, and mutations:

```tsx
import { createStore, createQuery, createMutation } from 'mikata';

// Reactive store with controlled updates
const [store, setStore] = createStore({ user: null, count: 0 });
setStore(s => { s.count++; });

// Async data fetching with caching and auto-refetch
const user = createQuery({
  key: () => userId(),
  fn: async (id, { signal }) => {
    const res = await fetch(`/api/users/${id}`, { signal });
    return res.json();
  },
  staleTime: 30_000,
});

// user.data(), user.isLoading(), user.error(), user.refetch()

// Write operations
const saveUser = createMutation({
  fn: async (data) => fetch('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: () => user.refetch(),
});
```

---

## Router

Client-side routing with typed params, guards, nested layouts, and lazy loading:

```tsx
import { createRouter, defineRoutes, searchParam, provideRouter, routeOutlet, useRouter, useGuard } from 'mikata';

const routes = defineRoutes([
  { path: '/', component: Home },
  {
    path: '/users/:id',
    lazy: () => import('./UserPage'),
    search: {
      tab: searchParam.string('profile'),
      page: searchParam.number(1),
    },
    children: [
      { path: 'posts', component: UserPosts },
      { path: 'settings', component: UserSettings, guard: requireAuth },
    ],
  },
]);

const router = createRouter({ routes, history: 'browser' });

function App() {
  provideRouter(router);
  return (
    <div>
      <nav>...</nav>
      <main>{routeOutlet()}</main>
    </div>
  );
}

function UserPage() {
  const router = useRouter();
  const id = computed(() => router.params().id);

  // Component-scoped guard -- auto-cleaned up when component unmounts
  useGuard(() => hasUnsavedChanges() ? confirm('Leave?') : true);

  return <div>User {id()}</div>;
}
```

Guards use return values (not callbacks): `true` = allow, `false` = block, `'/path'` = redirect.

---

## i18n

Internationalization with runtime translation loading and reactive locale switching:

```tsx
import { createI18n, provideI18n, useI18n } from 'mikata';

const en = {
  greeting: 'Hello {{name}}',
  nav: { home: 'Home', about: 'About' },
  items: { one: '{{count}} item', other: '{{count}} items' },
};

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
  loader: async (locale) => {
    const res = await fetch(`https://cdn.example.com/i18n/${locale}.json`);
    return res.json();
  },
});

function App() {
  provideI18n(i18n);
  return <Page />;
}

function Page() {
  const { t, fmt, setLocale } = useI18n();

  return (
    <div>
      <p>{t('greeting', { name: 'World' })}</p>
      <p>{t.plural('items', 3)}</p>
      <p>{fmt.number(1234.5, { style: 'currency', currency: 'USD' })}</p>
      <button onClick={() => setLocale('fr')}>French</button>
    </div>
  );
}
```

Translation keys are typed from the base locale object. Formatters wrap browser `Intl.*` APIs with zero bundle cost. Locale switching is reactive -- only components that call `t()` re-render.

---

## Transitions

Animated enter/exit for conditional rendering and lists:

```tsx
import { transition, transitionGroup } from 'mikata';

// CSS-based transition
transition(
  () => open(),
  () => <Modal />,
  { name: 'fade', duration: 300 }
);

// JS hooks for programmatic animation
transition(
  () => visible(),
  () => <Panel />,
  {
    onEnter: (el, done) => {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }).finished.then(done);
    },
    onLeave: (el, done) => {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).finished.then(done);
    },
  }
);

// List transitions
transitionGroup(
  () => items(),
  (item) => <div class="card">{item}</div>,
  () => <div>No items</div>,
  { key: (item) => item.id },
  { name: 'list', duration: 200 }
);
```

---

## Additional Features

- **Lazy loading** -- `lazy(() => import('./Page'))` with fallback and error UI, plus `preload()` for prefetching
- **Portals** -- `portal(() => <Modal />, document.body)` renders into a different DOM subtree
- **Error boundaries** -- `<ErrorBoundary fallback={(err, reset) => ...}>` catches render errors
- **Form bindings** -- `model(getter, setter)` for two-way binding on inputs, checkboxes, selects
- **Refs** -- `createRef()` captures DOM elements, works as both object and callback ref
- **DevTools** -- Built-in console API and floating overlay panel for inspecting the reactive graph

---

## UI Components

A component library with CSS variable theming, `data-*` attribute selectors, and BEM naming (`mkt-` prefix). No style props -- theming is pure CSS.

```tsx
import { ThemeProvider, createTheme, Button, TextInput, Stack, Alert, Modal, Badge } from '@mikata/ui';

const theme = createTheme({ 'color-primary-6': '#7c3aed' });

function App() {
  return (
    <ThemeProvider theme={theme} colorScheme="auto">
      <Stack gap="md">
        <Alert variant="light" color="blue" title="Welcome">Hello!</Alert>
        <TextInput label="Name" placeholder="Enter name" />
        <Button variant="filled" color="primary" size="md">Submit</Button>
        <Badge variant="dot" color="green">Active</Badge>
      </Stack>
    </ThemeProvider>
  );
}
```

**Components:** Button, ActionIcon, CloseButton, ButtonGroup, TextInput, Textarea, PasswordInput, NumberInput, Checkbox, Radio, Switch, Select, Slider, Stack, Group, Grid, Container, Divider, Space, Text, Title, Anchor, Alert, Badge, Loader, Progress, Skeleton, Modal, Drawer, Tooltip, Popover.

**Key patterns:**
- CSS variables for tokens (`--mkt-color-primary-6`, `--mkt-space-4`, `--mkt-radius-sm`)
- `data-variant`, `data-size`, `data-color` attributes drive CSS styling
- `classNames` prop targets inner parts: `classNames={{ root: '...', label: '...' }}`
- Dark mode via `[data-mkt-color-scheme="dark"]` CSS selectors
- `ThemeProvider` uses `provide()`/`inject()` context -- child components access via `useTheme()`

**Utilities:** `@mikata/ui` ships scope-aware helpers for common UI concerns. Because components run setup-once, naming follows Mikata conventions rather than React hook names:

- `createX` — returns reactive state: `createDisclosure`, `createMediaQuery`, `createLocalStorage`, `createClipboard`, `createToggle`, `createDebouncedSignal`, `createThrottledSignal`, `createPrevious`, `createViewportSize`, `createInterval`, `createTimeout`, `createIdle`, `createNetworkStatus`, `createOs`, `createReducedMotion`, `createPageVisibility`, `createIntersection`, `createResizeObserver`
- `onX` — attaches a side effect, auto-cleaned on scope dispose: `onClickOutside`, `onFocusTrap`, `onScrollLock`, `onHotkeys`, `onWindowEvent`, `onDocumentEvent`, `onPageLeave`, `onDocumentTitle`
- `useX` — reserved for context consumers: `useTheme`, `useUILabels`
- Pure utilities: `uniqueId`, `mergeClasses`, `mergeRefs`

---

## Project Structure

```
mikata/
  packages/
    reactivity/    # Signals, computed, reactive proxies, effects, scopes
    runtime/       # DOM rendering, components, control flow, context, transitions
    compiler/      # Vite/Babel plugin -- JSX to DOM operations
    store/         # Reactive stores, queries, mutations
    router/        # Client-side routing, guards, nested layouts
    i18n/          # Internationalization, runtime loading, formatters
    ui/            # Component library -- buttons, inputs, layout, feedback, overlays
    testing/       # Test utilities (renderComponent, fireEvent, flush)
    mikata/        # Umbrella package re-exporting everything
```

All packages are available individually (`@mikata/reactivity`, `@mikata/runtime`, etc.) or through the umbrella package (`import { signal, render, createStore } from 'mikata'`).
