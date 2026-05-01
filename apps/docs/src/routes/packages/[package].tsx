import { useMeta } from '@mikata/kit/head';
import { Link, useParams } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

type ApiRow = {
  name: string;
  kind: string;
  description: string;
};

type RelatedLink = {
  label: string;
  href: string;
};

type PackageDoc = {
  slug: string;
  title: string;
  description: string;
  install: string;
  imports: string[];
  source: string;
  tests: string[];
  whenToUse: string[];
  apis: ApiRow[];
  example: string;
  exampleLang?: string;
  related: RelatedLink[];
};

const PACKAGE_DOCS = [
  {
    slug: 'mikata',
    title: 'mikata',
    description:
      'Umbrella package that re-exports the most common app APIs from reactivity, runtime, router, store, form, i18n, and icons.',
    install: 'pnpm add mikata',
    imports: ['signal, computed, render, show, each', 'createRouter, Link, routeOutlet', 'createStore, createQuery, createForm'],
    source: 'packages/mikata',
    tests: ['packages/mikata/src/index.ts'],
    whenToUse: [
      'App code that wants one simple import surface.',
      'Docs, tutorials, and starter templates where copy-paste clarity matters.',
      'Small apps that are not trying to trim every optional dependency boundary.',
    ],
    apis: [
      { name: 'signal, computed, effect', kind: 'Reactivity', description: 'Core signal primitives from @mikata/reactivity.' },
      { name: 'render, hydrate, show, each', kind: 'Runtime', description: 'DOM rendering and JSX control-flow helpers from @mikata/runtime.' },
      { name: 'createRouter, Link, routeOutlet', kind: 'Routing', description: 'Client routing APIs from @mikata/router.' },
      { name: 'createStore, createQuery', kind: 'State', description: 'Structured state and async query helpers from @mikata/store.' },
      { name: 'createForm, createI18n, createIcon', kind: 'Features', description: 'Common form, i18n, and icon helpers.' },
    ],
    example: `import { signal, computed, render, show } from 'mikata';

function Counter() {
  const [count, setCount] = signal(0);
  const label = computed(() => count() === 1 ? 'click' : 'clicks');

  return (
    <button onClick={() => setCount(count() + 1)}>
      {count()} {label()}
      {show(() => count() >= 5, () => <strong> Nice rhythm.</strong>)}
    </button>
  );
}

render(() => <Counter />, document.getElementById('root')!);`,
    related: [
      { label: 'Choosing packages', href: '/start/choosing-packages' },
      { label: 'Reactivity', href: '/core/reactivity' },
      { label: 'Runtime', href: '/core/runtime' },
    ],
  },
  {
    slug: 'reactivity',
    title: '@mikata/reactivity',
    description:
      'Fine-grained signals, computed values, effects, scopes, batching, and reactive object proxies.',
    install: 'pnpm add @mikata/reactivity',
    imports: ['signal, computed, effect, renderEffect', 'reactive, batch, untrack, on', 'createScope, onCleanup, flushSync'],
    source: 'packages/reactivity',
    tests: ['packages/reactivity/__tests__'],
    whenToUse: [
      'Any package or app code that needs state without DOM rendering.',
      'Shared stores, services, and framework internals.',
      'Tests that need deterministic flushing with flushSync().',
    ],
    apis: [
      { name: 'signal(initial)', kind: 'State', description: 'Creates a read signal and setter pair.' },
      { name: 'computed(fn)', kind: 'Derived', description: 'Caches a derived value and tracks dependencies automatically.' },
      { name: 'effect(fn), renderEffect(fn)', kind: 'Effects', description: 'Runs side effects when tracked reads change.' },
      { name: 'reactive(object)', kind: 'Objects', description: 'Wraps object properties in fine-grained reactive tracking.' },
      { name: 'batch(fn), untrack(fn), on(source, fn)', kind: 'Control', description: 'Tune dependency tracking and update scheduling.' },
      { name: 'createScope(fn), onCleanup(fn)', kind: 'Lifecycle', description: 'Group effects and teardown work.' },
    ],
    example: `import { signal, computed, effect, onCleanup } from '@mikata/reactivity';

const [first, setFirst] = signal('Ada');
const [last, setLast] = signal('Lovelace');
const fullName = computed(() => \`\${first()} \${last()}\`);

effect(() => {
  const title = fullName();
  document.title = title;
  onCleanup(() => {
    document.title = 'Mikata';
  });
});

setFirst('Grace');`,
    related: [
      { label: 'Reactivity guide', href: '/core/reactivity' },
      { label: 'Stores', href: '/state/stores' },
    ],
  },
  {
    slug: 'runtime',
    title: '@mikata/runtime',
    description:
      'JSX runtime, DOM renderer, component lifecycle, control flow, context, portals, suspense, lazy loading, and hydration helpers.',
    install: 'pnpm add @mikata/runtime',
    imports: ['render, hydrate, onMount, onCleanup', 'show, each, switchMatch, Dynamic, RawHTML', 'createContext, provide, inject, portal'],
    source: 'packages/runtime',
    tests: ['packages/runtime/__tests__'],
    whenToUse: [
      'Apps or packages that render Mikata JSX.',
      'Custom component libraries that need lifecycle and context primitives.',
      'SSR clients that hydrate server-rendered DOM.',
    ],
    apis: [
      { name: 'render(fn, container)', kind: 'Rendering', description: 'Mounts a component tree into a container and returns a disposer.' },
      { name: 'hydrate(fn, container, options?)', kind: 'Hydration', description: 'Adopts existing SSR DOM instead of recreating it.' },
      { name: 'onMount(fn), onCleanup(fn)', kind: 'Lifecycle', description: 'Run browser work after insertion and teardown on disposal.' },
      { name: 'show, each, switchMatch, Dynamic', kind: 'Control flow', description: 'Render conditional, list, branch, and dynamic component regions.' },
      { name: 'createContext, provide, inject', kind: 'Context', description: 'Pass dependencies through the component tree.' },
      { name: 'Suspense, lazy, ErrorBoundary', kind: 'Boundaries', description: 'Handle async components and rendering failures.' },
    ],
    example: `import { render, show, each, onMount } from '@mikata/runtime';
import { signal } from '@mikata/reactivity';

function TodoList() {
  const [items, setItems] = signal(['Write docs', 'Ship release']);

  onMount(() => {
    console.log('TodoList mounted');
  });

  return (
    <section>
      {show(() => items().length === 0, () => <p>No tasks yet.</p>)}
      <ul>{each(items, (item) => <li>{item}</li>)}</ul>
      <button onClick={() => setItems([...items(), 'Celebrate'])}>Add</button>
    </section>
  );
}

render(() => <TodoList />, document.getElementById('root')!);`,
    related: [
      { label: 'Runtime guide', href: '/core/runtime' },
      { label: 'Control flow', href: '/core/control-flow' },
      { label: 'Rendering and hydration', href: '/core/rendering' },
    ],
  },
  {
    slug: 'compiler',
    title: '@mikata/compiler',
    description:
      'Vite plugin and Babel transform that compile JSX into direct DOM operations using @mikata/runtime helpers.',
    install: 'pnpm add -D @mikata/compiler',
    imports: ['mikata default Vite plugin', 'mikataJSXPlugin advanced Babel transform', 'MikataPluginOptions type'],
    source: 'packages/compiler',
    tests: ['packages/compiler/__tests__'],
    whenToUse: [
      'Vite apps that write Mikata JSX.',
      'Tooling that needs the lower-level Babel JSX transform.',
      'Debugging generated DOM helper output or HMR behavior.',
    ],
    apis: [
      { name: 'mikata(options?)', kind: 'Vite plugin', description: 'Configures JSX preservation, __DEV__, transform, source maps, and HMR.' },
      { name: 'MikataPluginOptions.dev', kind: 'Option', description: 'Enables development diagnostics; defaults to true.' },
      { name: 'MikataPluginOptions.hmr', kind: 'Option', description: 'Enables component hot replacement during Vite serve.' },
      { name: 'mikataJSXPlugin', kind: 'Babel plugin', description: 'Low-level transform used by the Vite plugin.' },
    ],
    example: `import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';

export default defineConfig({
  plugins: [
    mikata({
      dev: process.env.NODE_ENV !== 'production',
      hmr: true,
    }),
  ],
});`,
    exampleLang: 'ts',
    related: [
      { label: 'Compiler guide', href: '/core/compiler' },
      { label: 'Installation', href: '/start/install' },
      { label: 'Tooling compiler docs', href: '/tooling/compiler' },
    ],
  },
  {
    slug: 'router',
    title: '@mikata/router',
    description:
      'Client-side routing with nested layouts, route guards, typed params, typed search params, history adapters, and link components.',
    install: 'pnpm add @mikata/router',
    imports: ['createRouter, defineRoutes, searchParam', 'provideRouter, routeOutlet, Link', 'useRouter, useParams, useSearchParams, useGuard'],
    source: 'packages/router',
    tests: ['packages/router/__tests__'],
    whenToUse: [
      'SPAs that need URL state without the full Kit file-router.',
      'Tests and examples that need memory routing.',
      'Apps with nested layouts or typed query strings.',
    ],
    apis: [
      { name: 'createRouter(options)', kind: 'Router', description: 'Creates the router with routes, history mode, base path, guards, and scroll behavior.' },
      { name: 'defineRoutes(routes)', kind: 'Routes', description: 'Preserves route definitions and path types.' },
      { name: 'searchParam', kind: 'Search', description: 'Defines typed string, number, boolean, array, enum, and JSON search params.' },
      { name: 'provideRouter, routeOutlet', kind: 'Rendering', description: 'Provide router context and render matched route components.' },
      { name: 'Link', kind: 'Navigation', description: 'Anchor component with base-aware href, active state, and click interception.' },
      { name: 'useParams, useSearchParams, useMatch', kind: 'Hooks', description: 'Read current route state from components.' },
    ],
    example: `import { createRouter, provideRouter, routeOutlet, Link } from '@mikata/router';
import { render } from '@mikata/runtime';

const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/users/:id', component: User },
  ],
});

function App() {
  provideRouter(router);
  return (
    <>
      <nav><Link to="/users/42">Ada</Link></nav>
      {routeOutlet()}
    </>
  );
}

render(() => <App />, document.getElementById('root')!);`,
    related: [
      { label: 'Kit routing', href: '/routing/kit' },
      { label: 'Layouts', href: '/app/layouts' },
    ],
  },
  {
    slug: 'kit',
    title: '@mikata/kit',
    description:
      'Meta-framework layer for file routes, route manifests, SSR, SSG, loaders, actions, API routes, metadata, and deploy adapters.',
    install: 'pnpm add @mikata/kit',
    imports: ['mikataKit Vite plugin', '@mikata/kit/client mount', '@mikata/kit/server renderRoute', '@mikata/kit/head useMeta'],
    source: 'packages/kit',
    tests: ['packages/kit/__tests__', 'examples/kit-ssr'],
    whenToUse: [
      'Apps that want file-based routing and prerendering.',
      'SSR apps with loaders, actions, sessions, and API routes.',
      'Static sites that still want a hydrated client.',
    ],
    apis: [
      { name: 'mikataKit(options)', kind: 'Vite plugin', description: 'Scans routes, emits manifests, injects setup HTML, and runs prerender.' },
      { name: 'mount(manifest, root, options?)', kind: 'Client', description: 'Preloads the initial match and hydrates the app.' },
      { name: 'renderRoute(manifest, url, options?)', kind: 'Server', description: 'Renders a route to HTML for SSR or prerender.' },
      { name: 'loader, useLoaderData', kind: 'Data', description: 'Server/client data loading with typed route data.' },
      { name: 'action, Form, useActionData', kind: 'Mutations', description: 'Progressively enhanced form submissions.' },
      { name: 'useMeta', kind: 'Head', description: 'Declare titles, descriptions, and head tags from route components.' },
    ],
    example: `import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';
import { mikataKit } from '@mikata/kit';

export default defineConfig({
  plugins: [
    mikata(),
    mikataKit({
      routesDir: 'src/routes',
      prerender: true,
      css: '/src/styles.css',
    }),
  ],
});`,
    exampleLang: 'ts',
    related: [
      { label: 'File routes', href: '/app/file-routes' },
      { label: 'SSR and SSG', href: '/app/ssr-ssg' },
      { label: 'Deployment', href: '/app/deployment' },
    ],
  },
  {
    slug: 'server',
    title: '@mikata/server',
    description:
      'Server-side renderer that runs Mikata components against a DOM shim, serializes HTML, and collects query state for hydration.',
    install: 'pnpm add @mikata/server',
    imports: ['renderToString, installShim', 'escapeStateScript, renderStateScript', 'isSSR'],
    source: 'packages/server',
    tests: ['packages/server/__tests__'],
    whenToUse: [
      'Custom SSR integrations outside @mikata/kit.',
      'Tests or tools that need a server DOM shim.',
      'Advanced render pipelines that need access to serialized query state.',
    ],
    apis: [
      { name: 'renderToString(component, options?)', kind: 'SSR', description: 'Renders a component tree to HTML plus optional query state script.' },
      { name: 'verifyHydration', kind: 'Option', description: 'Hydrates the generated HTML in the shim to catch SSR/client mismatches.' },
      { name: 'installShim()', kind: 'DOM shim', description: 'Installs the minimal DOM implementation used by the renderer.' },
      { name: 'renderStateScript(state, global)', kind: 'Serialization', description: 'Builds an inline state payload script.' },
      { name: 'isSSR', kind: 'Runtime flag', description: 'Reports whether runtime code is executing during server rendering.' },
    ],
    example: `import { renderToString } from '@mikata/server';
import { App } from './App';

export async function renderPage(url: string) {
  const { html, stateScript } = await renderToString(() => <App url={url} />, {
    verifyHydration: true,
  });

  return \`<!doctype html>
<html>
  <body>
    <div id="root">\${html}</div>
    \${stateScript}
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>
</html>\`;
}`,
    related: [
      { label: 'Rendering and hydration', href: '/core/rendering' },
      { label: 'SSR and SSG', href: '/app/ssr-ssg' },
    ],
  },
  {
    slug: 'store',
    title: '@mikata/store',
    description:
      'Structured reactive stores, derived values, keyed selectors, async queries, mutations, invalidation, and SSR query collection.',
    install: 'pnpm add @mikata/store',
    imports: ['createStore, derived, createSelector', 'createQuery, createMutation', 'invalidateTag, collectAll'],
    source: 'packages/store',
    tests: ['packages/store/__tests__'],
    whenToUse: [
      'Object-shaped client state that would be awkward as many signals.',
      'Async data with loading, error, retry, and invalidation state.',
      'SSR routes that need to collect query payloads before hydration.',
    ],
    apis: [
      { name: 'createStore(initial)', kind: 'Store', description: 'Creates a reactive object and batched setter.' },
      { name: 'derived(fn)', kind: 'Derived', description: 'Computed helper named for store use cases.' },
      { name: 'createSelector(source)', kind: 'Selectors', description: 'Efficient keyed boolean checks for selected rows/items.' },
      { name: 'createQuery(options)', kind: 'Async', description: 'Fetch state with cache keys, tags, retry, and hydration support.' },
      { name: 'createMutation(options)', kind: 'Mutations', description: 'Async write state with success/error callbacks.' },
      { name: 'invalidateTag(s)', kind: 'Cache', description: 'Marks related queries stale and triggers refreshes.' },
    ],
    example: `import { createStore, createQuery, invalidateTag } from '@mikata/store';

const [filters, setFilters] = createStore({ search: '' });

const users = createQuery({
  key: () => ['users', filters.search],
  tags: ['users'],
  fn: async () => {
    const res = await fetch('/api/users?q=' + encodeURIComponent(filters.search));
    return res.json() as Promise<Array<{ id: string; name: string }>>;
  },
});

setFilters({ search: 'ada' });
invalidateTag('users');`,
    exampleLang: 'ts',
    related: [
      { label: 'Stores', href: '/state/stores' },
      { label: 'Queries and mutations', href: '/state/queries' },
    ],
  },
  {
    slug: 'persist',
    title: '@mikata/persist',
    description:
      'Storage-backed signals with localStorage, sessionStorage, IndexedDB, serialization, migration, and cross-tab sync support.',
    install: 'pnpm add @mikata/persist',
    imports: ['persistedSignal', 'localStorageAdapter, sessionStorageAdapter', 'indexedDBStorage'],
    source: 'packages/persist',
    tests: ['packages/persist/__tests__'],
    whenToUse: [
      'User preferences that should survive reloads.',
      'Draft form state and small offline-friendly values.',
      'Versioned client storage with custom serializers.',
    ],
    apis: [
      { name: 'persistedSignal(key, initial, options?)', kind: 'State', description: 'Creates a signal synchronized to a storage adapter.' },
      { name: 'localStorageAdapter', kind: 'Storage', description: 'Default browser localStorage adapter.' },
      { name: 'sessionStorageAdapter', kind: 'Storage', description: 'Per-tab storage adapter.' },
      { name: 'indexedDBStorage(name)', kind: 'Storage', description: 'Async IndexedDB-backed storage adapter.' },
      { name: 'migrate, serialize, deserialize', kind: 'Options', description: 'Customize versioning and non-JSON values.' },
    ],
    example: `import { persistedSignal } from '@mikata/persist';

const [theme, setTheme] = persistedSignal('theme', 'system', {
  version: 1,
  syncTabs: true,
});

setTheme('dark');
console.log(theme());`,
    exampleLang: 'ts',
    related: [
      { label: 'Persistence guide', href: '/state/persistence' },
      { label: 'Theming', href: '/ui/theming' },
    ],
  },
  {
    slug: 'form',
    title: '@mikata/form',
    description:
      'Form state, field props, validation resolvers, nested path helpers, and field-array utilities.',
    install: 'pnpm add @mikata/form',
    imports: ['createForm, createFieldArray', 'getPath, setPath', 'FormOptions, MikataForm, ValidatorSpec'],
    source: 'packages/form',
    tests: ['packages/form/__tests__'],
    whenToUse: [
      'Forms that need touched/dirty/error state.',
      'Validation with custom functions or schema-library resolvers.',
      'Repeatable field groups such as addresses, contacts, and line items.',
    ],
    apis: [
      { name: 'createForm(options)', kind: 'Form', description: 'Creates values, errors, status, input props, submit, and reset helpers.' },
      { name: 'form.getInputProps(path, options?)', kind: 'Fields', description: 'Connects DOM/UI inputs to form state.' },
      { name: 'form.onSubmit(onValid, onInvalid?)', kind: 'Submit', description: 'Validates and dispatches submit callbacks.' },
      { name: 'createFieldArray(form, path)', kind: 'Arrays', description: 'Manages repeatable nested fields.' },
      { name: 'getPath, setPath', kind: 'Utilities', description: 'Read and write nested values by dotted path.' },
    ],
    example: `import { createForm } from '@mikata/form';

const form = createForm({
  initialValues: { email: '', password: '' },
  validate: {
    email: (value) => value.includes('@') ? null : 'Enter an email',
    password: (value) => value.length >= 8 ? null : 'Use at least 8 characters',
  },
});

export function LoginForm() {
  return (
    <form onSubmit={form.onSubmit((values) => console.log(values))}>
      <input {...form.getInputProps('email')} />
      <input type="password" {...form.getInputProps('password')} />
      <button type="submit">Sign in</button>
    </form>
  );
}`,
    related: [
      { label: 'Model binding', href: '/core/model-binding' },
      { label: 'Inputs', href: '/ui/inputs' },
    ],
  },
  {
    slug: 'i18n',
    title: '@mikata/i18n',
    description:
      'Locale switching, reactive translations, interpolation, plural rules, ICU message formatting, and formatter hooks.',
    install: 'pnpm add @mikata/i18n',
    imports: ['createI18n, provideI18n, useI18n', 'formatIcu, parseIcu, looksLikeIcu', 'formatMessage, interpolate'],
    source: 'packages/i18n',
    tests: ['packages/i18n/__tests__'],
    whenToUse: [
      'Apps with multiple locales or runtime locale switching.',
      'Messages with variables, plurals, or simple ICU syntax.',
      'Component trees that need a shared translation context.',
    ],
    apis: [
      { name: 'createI18n(options)', kind: 'Instance', description: 'Creates locale state, translator, dictionary loading, and formatters.' },
      { name: 'provideI18n, useI18n', kind: 'Context', description: 'Share and consume an i18n instance from components.' },
      { name: 't(key, params?)', kind: 'Translate', description: 'Reactive translation function returned by the instance.' },
      { name: 'formatMessage, interpolate', kind: 'Messages', description: 'Format templates and replace named values.' },
      { name: 'formatIcu, parseIcu', kind: 'ICU', description: 'Format and inspect ICU-like messages.' },
    ],
    example: `import { createI18n, provideI18n, useI18n } from '@mikata/i18n';

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { hello: 'Hello, {name}!' },
    fr: { hello: 'Bonjour, {name}!' },
  },
});

export function App() {
  provideI18n(i18n);
  const { t, setLocale } = useI18n();

  return <button onClick={() => setLocale('fr')}>{t('hello', { name: 'Ada' })}</button>;
}`,
    related: [
      { label: 'i18n guide', href: '/state/i18n' },
      { label: 'UI labels and direction', href: '/ui/theming' },
    ],
  },
  {
    slug: 'ui',
    title: '@mikata/ui',
    description:
      'Themeable component library with layout, typography, inputs, buttons, feedback, data display, navigation, overlays, and utility hooks.',
    install: 'pnpm add @mikata/ui',
    imports: ['ThemeProvider, createTheme, applyThemeToDocument', 'Button, TextInput, Modal, Table, Tabs', 'createDisclosure, createClipboard, onHotkeys'],
    source: 'packages/ui',
    tests: ['packages/ui/__tests__'],
    whenToUse: [
      'Apps that need accessible components with one theme system.',
      'Admin tools, dashboards, and forms that need consistent controls.',
      'Teams that want utility hooks alongside components.',
    ],
    apis: [
      { name: 'ThemeProvider, createTheme', kind: 'Theme', description: 'Provide tokens, color scheme, direction, and component defaults.' },
      { name: 'Layout components', kind: 'Layout', description: 'Box, Stack, Group, Grid, Flex, Container, AppShell, ScrollArea, and more.' },
      { name: 'Input components', kind: 'Inputs', description: 'Text, select, checkbox, slider, date, file, chip, and rating controls.' },
      { name: 'Overlay components', kind: 'Overlays', description: 'Modal, Drawer, Popover, Tooltip, HoverCard, Overlay, and Affix.' },
      { name: 'Utility hooks', kind: 'Utilities', description: 'Disclosure, clipboard, media query, storage, hotkeys, focus trap, and observers.' },
    ],
    example: `import { ThemeProvider, Button, TextInput, Stack } from '@mikata/ui';
import '@mikata/ui/styles.css';

export function Signup() {
  return (
    <ThemeProvider>
      <Stack gap="md">
        <TextInput label="Email" type="email" />
        <Button variant="filled">Create account</Button>
      </Stack>
    </ThemeProvider>
  );
}`,
    related: [
      { label: 'UI overview', href: '/ui/overview' },
      { label: 'Theming', href: '/ui/theming' },
      { label: 'Button', href: '/ui/button' },
    ],
  },
  {
    slug: 'icons',
    title: '@mikata/icons',
    description:
      'SVG icon primitives, built-in icons, and a createIcon helper compatible with Lucide-style icon node tuples.',
    install: 'pnpm add @mikata/icons',
    imports: ['createIcon', 'Copy, Check, Github, Sun, Moon', 'IconNode, IconProps'],
    source: 'packages/icons',
    tests: ['packages/icons/__tests__'],
    whenToUse: [
      'Buttons, menus, navigation, and status UI that need consistent SVG icons.',
      'Custom icon sets represented as icon-node tuples.',
      'Apps that use @mikata/ui icon props.',
    ],
    apis: [
      { name: 'createIcon(node, props?)', kind: 'Render', description: 'Creates an SVG element from an icon tuple.' },
      { name: 'Built-in icons', kind: 'Icons', description: 'Exports common icons such as Copy, Check, Github, Sun, Moon, and ChevronRight.' },
      { name: 'IconNode', kind: 'Type', description: 'Tuple representation of an SVG root and children.' },
      { name: 'IconProps', kind: 'Type', description: 'Size, stroke width, class, aria, and SVG attributes.' },
    ],
    example: `import { createIcon, Github } from '@mikata/icons';

export function GitHubLink() {
  return (
    <a href="https://github.com/blowerydev/mikata" aria-label="Mikata on GitHub">
      {createIcon(Github, { size: 18 })}
    </a>
  );
}`,
    related: [
      { label: 'UI buttons', href: '/ui/button' },
      { label: 'UI overview', href: '/ui/overview' },
    ],
  },
  {
    slug: 'testing',
    title: '@mikata/testing',
    description:
      'Vitest-oriented render helpers, DOM queries, event helpers, and flush utilities for Mikata components.',
    install: 'pnpm add -D @mikata/testing vitest jsdom',
    imports: ['renderComponent, renderContent', 'fireEvent, waitForUpdate, flush', 'flushSync'],
    source: 'packages/testing',
    tests: ['packages/testing/__tests__'],
    whenToUse: [
      'Component tests that need a DOM container and cleanup.',
      'Event tests that should mirror browser input and focus behavior.',
      'Reactive assertions that need updates flushed predictably.',
    ],
    apis: [
      { name: 'renderComponent(Component, props?)', kind: 'Render', description: 'Mounts a component into a detached container and returns query helpers.' },
      { name: 'renderContent(fn)', kind: 'Render', description: 'Mounts arbitrary DOM-producing content.' },
      { name: 'fireEvent', kind: 'Events', description: 'Dispatches click, input, change, key, focus, blur, and submit events.' },
      { name: 'waitForUpdate()', kind: 'Async', description: 'Flushes synchronous updates, then awaits one microtask.' },
      { name: 'flush()', kind: 'Sync', description: 'Flushes pending reactive work immediately.' },
    ],
    example: `import { describe, expect, it } from 'vitest';
import { renderComponent, fireEvent, waitForUpdate } from '@mikata/testing';
import { Counter } from './Counter';

it('increments on click', async () => {
  const view = renderComponent(Counter, { initial: 0 });

  fireEvent.click(view.get('button'));
  await waitForUpdate();

  expect(view.text()).toContain('1');
  view.dispose();
});`,
    related: [
      { label: 'Testing docs', href: '/tooling/testing' },
      { label: 'Runtime rendering', href: '/core/rendering' },
    ],
  },
  {
    slug: 'eslint-plugin',
    title: '@mikata/eslint-plugin',
    description:
      'ESLint rules and recommended configs that catch common Mikata component, signal, effect, and Kit route mistakes.',
    install: 'pnpm add -D @mikata/eslint-plugin eslint',
    imports: ['default plugin export', 'rules named export', 'configs.recommended, configs.recommended-kit'],
    source: 'packages/eslint-plugin',
    tests: ['packages/eslint-plugin/__tests__'],
    whenToUse: [
      'Apps that want guardrails for setup-runs-once components.',
      'Teams adopting Mikata signal and cleanup conventions.',
      'Kit apps that want route-specific lint rules.',
    ],
    apis: [
      { name: 'configs.recommended', kind: 'Config', description: 'Flat config with core Mikata rules.' },
      { name: 'configs.recommended-kit', kind: 'Config', description: 'Adds Kit route rules for redirects and API route exports.' },
      { name: 'rules', kind: 'Rules', description: 'Named rule modules for custom ESLint config composition.' },
      { name: 'rules-of-setup', kind: 'Rule', description: 'Ensures setup-only APIs run in valid component/scope positions.' },
      { name: 'require-effect-cleanup', kind: 'Rule', description: 'Flags effects/listeners/timers without cleanup.' },
    ],
    example: `import mikata from '@mikata/eslint-plugin';

export default [
  mikata.configs.recommended,
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      ...mikata.configs['recommended-kit'].rules,
    },
  },
];`,
    exampleLang: 'js',
    related: [
      { label: 'ESLint docs', href: '/tooling/eslint' },
      { label: 'Runtime lifecycle', href: '/core/runtime' },
    ],
  },
  {
    slug: 'create-mikata',
    title: 'create-mikata',
    description:
      'Project scaffolder for Mikata apps with presets, package-manager detection, feature flags, and generated examples.',
    install: 'pnpm create mikata my-app',
    imports: ['CLI command: create-mikata', '--template minimal|spa|ssr|full', '--router, --kit, --ui, --testing, --eslint'],
    source: 'packages/create-mikata',
    tests: ['packages/create-mikata/src', 'packages/create-mikata/templates'],
    whenToUse: [
      'Starting a new Mikata app from a maintained template.',
      'Creating a router, Kit SSR, UI, testing, or full-stack starter.',
      'Checking how recommended app files are wired together.',
    ],
    apis: [
      { name: '--template <preset>', kind: 'Preset', description: 'Selects minimal, spa, ssr, or full feature sets.' },
      { name: '--router / --kit', kind: 'Routing', description: 'Adds SPA router or Kit file routing and SSR setup.' },
      { name: '--ui / --icons', kind: 'Interface', description: 'Adds component styles, ThemeProvider, and icon examples.' },
      { name: '--form / --i18n / --store', kind: 'Features', description: 'Adds examples and dependencies for app features.' },
      { name: '--testing / --eslint', kind: 'Tooling', description: 'Adds Vitest helpers and Mikata lint rules.' },
      { name: '--yes, --pm', kind: 'Automation', description: 'Skips prompts and chooses the install command hint.' },
    ],
    example: `pnpm create mikata my-app --template full --pm pnpm
cd my-app
pnpm install
pnpm dev`,
    exampleLang: 'shell',
    related: [
      { label: 'Create a project', href: '/start/create-project' },
      { label: 'Project structure', href: '/start/project-structure' },
      { label: 'create-mikata tooling', href: '/tooling/create-mikata' },
    ],
  },
] as const satisfies readonly PackageDoc[];

const PACKAGE_BY_SLUG: Record<string, PackageDoc> = Object.fromEntries(
  PACKAGE_DOCS.map((pkg) => [pkg.slug, pkg]),
);

const highlightedExamples = Object.fromEntries(
  await Promise.all(
    PACKAGE_DOCS.map(async (pkg) => [
      pkg.slug,
      await highlight(pkg.example, pkg.exampleLang ?? 'tsx'),
    ]),
  ),
) as Record<string, string>;

const highlightedInstalls = Object.fromEntries(
  await Promise.all(
    PACKAGE_DOCS.map(async (pkg) => [pkg.slug, await highlight(pkg.install, 'shell')]),
  ),
) as Record<string, string>;

// Array form: one nav entry per generated URL. The kit nav scanner
// inlines this list into the virtual:mikata-nav module - it must be a
// pure literal expression because the scanner evaluates it at build
// time without module scope.
export const nav = [
  { path: '/packages/mikata', title: 'mikata', section: 'Packages', order: 1 },
  { path: '/packages/reactivity', title: '@mikata/reactivity', section: 'Packages', order: 2 },
  { path: '/packages/runtime', title: '@mikata/runtime', section: 'Packages', order: 3 },
  { path: '/packages/compiler', title: '@mikata/compiler', section: 'Packages', order: 4 },
  { path: '/packages/router', title: '@mikata/router', section: 'Packages', order: 5 },
  { path: '/packages/kit', title: '@mikata/kit', section: 'Packages', order: 6 },
  { path: '/packages/server', title: '@mikata/server', section: 'Packages', order: 7 },
  { path: '/packages/store', title: '@mikata/store', section: 'Packages', order: 8 },
  { path: '/packages/persist', title: '@mikata/persist', section: 'Packages', order: 9 },
  { path: '/packages/form', title: '@mikata/form', section: 'Packages', order: 10 },
  { path: '/packages/i18n', title: '@mikata/i18n', section: 'Packages', order: 11 },
  { path: '/packages/ui', title: '@mikata/ui', section: 'Packages', order: 12 },
  { path: '/packages/icons', title: '@mikata/icons', section: 'Packages', order: 13 },
  { path: '/packages/testing', title: '@mikata/testing', section: 'Packages', order: 14 },
  { path: '/packages/eslint-plugin', title: '@mikata/eslint-plugin', section: 'Packages', order: 15 },
  { path: '/packages/create-mikata', title: 'create-mikata', section: 'Packages', order: 16 },
];

export async function getStaticPaths() {
  return PACKAGE_DOCS.map((pkg) => ({ package: pkg.slug }));
}

export default function PackagePage() {
  const params = useParams<{ package: string }>();
  const doc = () => PACKAGE_BY_SLUG[params().package] ?? PACKAGE_BY_SLUG.mikata;

  useMeta({
    title: () => `${doc().title} - Package reference`,
    description: () => doc().description,
  });

  return (
    <article>
      <h1>{doc().title}</h1>
      <p>{doc().description}</p>

      <h2>Install</h2>
      <CodeBlock html={highlightedInstalls[doc().slug]} />

      <h2>Use it when</h2>
      <ul>
        {doc().whenToUse.map((item) => (
          <li>{item}</li>
        ))}
      </ul>

      <h2>Imports</h2>
      <table>
        <thead>
          <tr>
            <th>Import surface</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          {doc().imports.map((item) => (
            <tr>
              <td>
                <code>{item}</code>
              </td>
              <td>{importUse(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Core APIs</h2>
      <table>
        <thead>
          <tr>
            <th>API</th>
            <th>Kind</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          {doc().apis.map((api) => (
            <tr>
              <td>
                <code>{api.name}</code>
              </td>
              <td>{api.kind}</td>
              <td>{api.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Example</h2>
      <CodeBlock html={highlightedExamples[doc().slug]} />

      <h2>Related docs</h2>
      <ul>
        {doc().related.map((link) => (
          <li>
            <Link to={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>

      <h2>Source and tests</h2>
      <ul>
        <li>
          <a href={githubHref(doc().source)} target="_blank" rel="noreferrer">
            Source: <code>{doc().source}</code>
          </a>
        </li>
        {doc().tests.map((path) => (
          <li>
            <a href={githubHref(path)} target="_blank" rel="noreferrer">
              Reference: <code>{path}</code>
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

function githubHref(path: string): string {
  const mode = /\.[a-z]+$/i.test(path) ? 'blob' : 'tree';
  return `https://github.com/blowerydev/mikata/${mode}/main/${path}`;
}

function importUse(item: string): string {
  if (item.startsWith('CLI command')) return 'Run from a terminal; this is not imported in app code.';
  if (item.startsWith('--')) return 'Command-line flags accepted by the package.';
  if (item.includes('type') || /^[A-Z].* type$/.test(item)) return 'Type-only support for app and library code.';
  return 'Import these names from the package entry point unless the page notes a subpath.';
}
