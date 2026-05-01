import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Context', section: 'Core Concepts', order: 6 };

const contextExample = await highlight(
  `import { createContext, provide, inject, signal } from 'mikata';

const ThemeContext = createContext<'light' | 'dark'>('light');

function ThemeProvider(props: { children: Node }) {
  const [theme, setTheme] = signal<'light' | 'dark'>('dark');
  provide(ThemeContext, theme());

  return (
    <section data-theme={theme()}>
      <button onClick={() => setTheme(theme() === 'dark' ? 'light' : 'dark')}>
        Toggle
      </button>
      {props.children}
    </section>
  );
}

function Toolbar() {
  const theme = inject(ThemeContext);
  return <p>Current theme: {theme}</p>;
}`,
  'tsx',
);

const reactiveContext = await highlight(
  `const SessionContext = createContext<() => Session | null>();

function SessionProvider(props: { children: Node }) {
  const [session, setSession] = signal<Session | null>(null);
  provide(SessionContext, session);
  return props.children;
}

function AccountMenu() {
  const session = inject(SessionContext);
  return <span>{session()?.email ?? 'Signed out'}</span>;
}`,
  'tsx',
);

export default function Context() {
  useMeta({
    title: 'Context - Mikata',
    description: 'Provide and inject values through Mikata component scopes.',
  });

  return (
    <article>
      <h1>Context</h1>
      <p>
        Context passes values through the component tree without threading props
        through every layer. Providers store values on the current reactive
        scope, and injectors walk parent scopes until they find the nearest
        value.
      </p>

      <h2>Create and provide</h2>
      <CodeBlock html={contextExample} />
      <p>
        <code>provide()</code> must run inside a component or reactive scope.
        <code>inject()</code> returns the nearest provided value, or the default
        passed to <code>createContext()</code>.
      </p>

      <h2>Reactive values</h2>
      <p>
        Context stores the value you provide. If consumers need live updates,
        provide a signal getter, store, or other reactive object instead of a
        snapshot.
      </p>
      <CodeBlock html={reactiveContext} />

      <h2>Nesting and cleanup</h2>
      <ul>
        <li>Nested providers override outer providers for their descendants.</li>
        <li>When a provider component unmounts, its scope and context map are disposed.</li>
        <li>Dynamic subtrees from <code>show</code>, <code>each</code>, and routes keep their owner scope.</li>
        <li>Injecting a context without a provider or default throws an error.</li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/core/control-flow">Control flow</Link> covers the dynamic
          subtrees that preserve context ownership.
        </li>
        <li>
          <Link to="/app/sessions">Sessions</Link> will show a server-backed
          context pattern for auth.
        </li>
      </ul>
    </article>
  );
}
