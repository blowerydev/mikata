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

// Dynamic component swap — pick the component type reactively
import { Dynamic } from 'mikata';

<Dynamic component={() => isAdmin() ? AdminPanel : UserPanel} userId={id()} />
```

`Dynamic` disposes the old component's scope when the `component` getter returns a new value and forwards any remaining props through as reactive getters, so typed props stay live across swaps.

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

**Typed params from path literals.** Pass a path template to `useParams` / `useSearchParams` / `navigate` and parameter names are extracted at the type level — no hand-written shape:

```tsx
const params = useParams<'/users/:id/posts/:postId'>();
params().id;      // string
params().postId;  // string

router.navigate({ path: '/users/:id', params: { id: '42' } }); // params keyed to the path

type S = InferSearchSchema<typeof schema>; // { tab: string; page: number }
```

**Testing.** `createTestRouter(routes, '/initial')` wires a router to an in-memory history for unit tests. `createBrowserHistory` / `createHashHistory` / `createMemoryHistory` are also exported directly.

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
- **DevTools** -- Floating overlay + `window.__MIKATA_DEVTOOLS__` console API. Every signal/computed/effect is attributed to its owning component (`in <Button />`), with update counts, time-since-last-change, and effect run timings (last + cumulative). The panel has a search filter, click-to-expand rows (sources, subscribers, value, creation stack), a component tree, and an element picker (hover to highlight, click to jump to the owning component). Top-5 slowest effects and most-updated signals surface in the Overview tab. Toggle with `Ctrl+Shift+M`.
- **ESLint plugin** -- `@mikata/eslint-plugin` ships three rules to catch setup-once misuse at build time: `rules-of-setup` (flags `useX`/`provide`/`onMount`/etc. used after `await`, inside `effect`/`setTimeout`/`.then`, or at module top-level), `no-async-component` (components must be sync — use `lazy()` for code-split loading), and `no-destructured-props` (destructuring breaks getter-backed prop reactivity). Config: `import mikata from '@mikata/eslint-plugin'; export default [mikata.configs.recommended];`

---

## UI Components

A component library with CSS variable theming, `data-*` attribute selectors, and BEM naming (`mkt-` prefix). No style props -- theming is pure CSS.

```tsx
import { ThemeProvider, createTheme, Button, TextInput, Stack, Alert, Modal, Badge } from '@mikata/ui';

const theme = createTheme({
  colors: {
    brand: ['#f3f0ff', '#e5dbff', '#d0bfff', '#b197fc', '#9775fa',
            '#845ef7', '#7950f2', '#7048e8', '#6741d9', '#5f3dc4'],
  },
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 8 },
  defaultRadius: 'md',
  headings: { h1: { size: '2.25rem', weight: '700' } },
  components: {
    Button: { variant: 'light' },     // every Button defaults to variant='light'
    TextInput: { size: 'md' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme} colorScheme="auto">
      <Stack gap="md">
        <Alert variant="light" color="brand" title="Welcome">Hello!</Alert>
        <TextInput label="Name" placeholder="Enter name" />
        <Button color="brand">Submit</Button>
        <Badge variant="dot" color="green">Active</Badge>
      </Stack>
    </ThemeProvider>
  );
}
```

**Components:** Button, ActionIcon, CloseButton, ButtonGroup, TextInput, Textarea, PasswordInput, NumberInput, Checkbox, Radio, Switch, Select, Autocomplete, MultiSelect, Slider, Stack, Group, Grid, Container, Divider, Space, Text, Title, Anchor, Alert, Badge, Loader, Progress, Skeleton, Modal, Drawer, Tooltip, Popover.

**Async data:** `Select`, `Autocomplete`, and `MultiSelect` accept a fetcher in place of a static `data` array — e.g. `data={(query, signal) => fetch(...).then(r => r.json())}`. Debouncing (`debounceMs`, default 300ms), AbortController-based cancellation of superseded requests, and a loading indicator are built in.

**Theming:** Mantine-parity CSS-variable system. Zero per-render JS cost — the cascade does the work, theme changes only touch `style.setProperty` on a wrapper element.

- **11 built-in palettes** (`primary`, `gray`, `red`, `green`, `yellow`, `blue`, `cyan`, `teal`, `violet`, `pink`, `orange`) plus any you add via `theme.colors`. Each palette has 10 shades; custom palettes get runtime-emitted CSS rules via a per-component registry.
- **`primaryColor`** aliases one palette's shades onto `--mkt-color-primary-*` so `color="primary"` (or omitting `color`) follows your brand.
- **`primaryShade`** picks the canonical filled shade index per scheme (default `{ light: 6, dark: 8 }`), driving semantic aliases `--mkt-color-<name>-filled`, `-filled-hover`, `-light`, `-light-hover`, `-border`. Dark `-light` composites via `color-mix(in srgb, …-filled 15%, transparent)`.
- **`defaultRadius`** sets `--mkt-radius-default`. **`headings`** emits `--mkt-h{1..6}-size/-weight/-lh` consumed by `Title`. **`fontFamily`/`fontFamilyMono`** override body/mono fonts.
- **`cssVariablesResolver(ctx)`** is the escape hatch — return `{ variables?, light?, dark? }` to inject arbitrary tokens per scheme.
- **`components.X.defaultProps`** sets per-component defaults (`components: { Button: { variant: 'light' } }`) without editing callsites. User-provided props always win.
- **Back-compat:** `createTheme({ 'color-primary-6': '#7c3aed' })` still works — flat keys route into `theme.other` at highest precedence.
- **RTL support:** Set `direction="rtl"` on `ThemeProvider` (or `theme.direction`). Emits `dir="rtl"` on the wrapper; component CSS uses logical properties (`inset-inline-start`, `margin-inline-end`, `border-start-end-radius`, etc.) so layout flips automatically. Portals mirror direction via `applyThemeToPortal`. Keyboard nav (`Tabs`, `PinInput`, `RangeSlider`, `Tree`) flips ArrowLeft/ArrowRight. `Drawer` accepts `position="start"|"end"` (logical, flips with direction) alongside `"left"|"right"` (physical). Use `useDirection()` from `@mikata/ui` to read the reactive direction signal in custom components; returns `() => 'ltr'` outside a `ThemeProvider`.

**Key patterns:**
- CSS variables for tokens (`--mkt-color-primary-6`, `--mkt-color-primary-filled`, `--mkt-space-4`, `--mkt-radius-sm`)
- `data-variant`, `data-size`, `data-color` attributes drive CSS styling
- `classNames` prop targets inner parts: `classNames={{ root: '...', label: '...' }}`
- Dark mode via `[data-mkt-color-scheme="dark"]` CSS selectors
- `ThemeProvider` uses `provide()`/`inject()` context -- child components access via `useTheme()`, and per-component defaults flow through `useComponentDefaults<P>(name)`.

**Utilities:** `@mikata/ui` ships scope-aware helpers for common UI concerns. Because components run setup-once, naming follows Mikata conventions rather than React hook names:

- `createX` — returns reactive state: `createDisclosure`, `createMediaQuery`, `createLocalStorage`, `createClipboard`, `createToggle`, `createDebouncedSignal`, `createThrottledSignal`, `createPrevious`, `createViewportSize`, `createInterval`, `createTimeout`, `createIdle`, `createNetworkStatus`, `createOs`, `createReducedMotion`, `createPageVisibility`, `createIntersection`, `createResizeObserver`
- `onX` — attaches a side effect, auto-cleaned on scope dispose: `onClickOutside`, `onFocusTrap`, `onScrollLock`, `onHotkeys`, `onWindowEvent`, `onDocumentEvent`, `onPageLeave`, `onDocumentTitle`
- `useX` — reserved for context consumers: `useTheme`, `useDirection`, `useUILabels`
- Pure utilities: `uniqueId`, `mergeClasses`, `mergeRefs`

---

## Forms

`@mikata/form` is a signal-backed form handler inspired by `@mantine/form`. Setup-once (`createForm({...})` returns a stable handle), fine-grained reactivity (no re-render churn), and plays directly with `@mikata/ui` inputs.

```tsx
import { createForm } from '@mikata/form';
import { zodResolver } from '@mikata/form/resolvers/zod';
import { TextInput, PasswordInput, Checkbox, Button } from '@mikata/ui';
import { z } from 'zod';

const form = createForm({
  initialValues: { email: '', password: '', remember: false },
  validate: zodResolver(z.object({
    email: z.string().email(),
    password: z.string().min(8),
  })),
  validateInputOnBlur: true,
});

<form onSubmit={form.onSubmit((values) => save(values))}>
  <TextInput label="Email" {...form.getInputProps('email')} />
  <PasswordInput label="Password" {...form.getInputProps('password')} />
  <Checkbox label="Remember me" {...form.getInputProps('remember', { type: 'checkbox' })} />
  <Button type="submit" disabled={!form.isValid()}>Sign in</Button>
</form>
```

**Features:** `getInputProps` (spread-compatible), path-based access (`items.0.name`), array helpers (`insertListItem`, `removeListItem`, `reorderListItem`, `replaceListItem`), dirty/touched tracking, reset, transform, watch. Schema resolvers for **zod, yup, valibot, superstruct, joi** as sub-path imports so tree-shaking keeps unused ones out.

**Scoped sub-forms:** `form.scope('addresses.0')` returns a handle whose `getInputProps`, `setFieldValue`, `getValue`, `errors`, and array helpers are rooted at the given path — nested forms without string-concatenating paths. `.scope(sub)` composes further.

**Async validators:** return a `Promise<string | null>` from any field validator (e.g. a uniqueness check). The form dedupes in-flight checks per path, drops stale results, and exposes `form.isValidating(path?)` as a reactive signal for spinner UI. Pass `asyncDebounceMs` in `createForm` options to debounce on-change validation for network calls.

**Reactive errors:** `getInputProps` returns `error` as a getter `() => FormError | null | undefined` bound to the field's path. Mikata UI inputs (`TextInput`, `PasswordInput`, `Textarea`, `Checkbox`, `InputWrapper`) detect the function form and subscribe via `effect()`, so error messages and `aria-invalid` flip on and off automatically as validation state changes — no manual re-render. Pass `error={() => form.errors.foo}` when binding manually for the same behavior.

**Accessibility:** `getInputProps` returns values `InputWrapper` uses to wire `aria-invalid`, `aria-errormessage`, `aria-describedby`, and `role="alert"` on errors. `onSubmit` focuses the first invalid field after a failed validation.

**i18n:** Error values are `string | Node`. Pass `t.node('errors.invalidEmail')` from `@mikata/i18n` for reactive translated errors that update on locale change without re-validating. Every resolver accepts a `messages` callback for translation.

---

## Icons

`@mikata/icons` is a tiny, zero-dep factory for turning icon data into `SVGSVGElement` nodes. The data shape matches **Lucide** and **Tabler Icons** (`[tag, attrs, children[]]`), so you install whichever set you want and drop the per-icon export straight into `createIcon`:

```tsx
import { createIcon } from '@mikata/icons';
import { Download, Search } from 'lucide';
import { Button, TextInput } from '@mikata/ui';

Button({ leftIcon: createIcon(Download, { size: 16 }), children: 'Download' });
TextInput({ leftSection: createIcon(Search, { size: 16 }), placeholder: 'Search…' });
```

Every UI component that accepts an icon slot (`Button.leftIcon`, `Input.leftSection`, `Alert.icon`, `Notification.icon`, `NavLink.icon`, `Menu.icon`, `ActionIcon`, `ThemeIcon`…) takes a `Node`, and `createIcon` returns an `SVGSVGElement` — no wrapper needed.

For zero-dep projects, `@mikata/icons` also ships ~25 built-in nodes mirroring Lucide geometry (`Close, Check, ChevronDown/Up/Left/Right, Eye, EyeOff, Star, Search, Info, Warning, ErrorCircle, CheckCircle, Plus, Minus, Edit, Trash, User, Home, Settings, Menu, ExternalLink, DotsVertical, Refresh`). These are the same icons the UI library uses internally, so the chevrons in Accordion/NavLink, checkmarks in Checkbox/Chip/Stepper, close Xs in Alert/Modal/Drawer/Notification/Toast, and eye toggles in PasswordInput all route through `createIcon` with the built-in set.

**Props:** `size`, `color` (stroke), `strokeWidth`, `class`, `aria-label`, `aria-hidden`. Decorative by default — pass `aria-label` for announced icons. Zero runtime deps; `lucide` and `@tabler/icons` are optional peer deps so you pull in only what you use.

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
    form/          # Form state, validation, schema resolvers (zod, yup, valibot, ...)
    icons/         # Icon factory (Lucide/Tabler interop) + built-in icon set
    testing/       # Test utilities (renderComponent, fireEvent, flush)
    eslint-plugin/ # Lint rules for setup-once, props, and async components
    mikata/        # Umbrella package re-exporting everything
```

All packages are available individually (`@mikata/reactivity`, `@mikata/runtime`, etc.) or through the umbrella package (`import { signal, render, createStore } from 'mikata'`).
