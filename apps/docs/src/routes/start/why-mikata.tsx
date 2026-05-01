import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Why Mikata', section: 'Start', order: 2 };

const runOnce = await highlight(
  `import { signal } from 'mikata';

function Counter() {
  const [count, setCount] = signal(0);

  // Counter runs once. The text binding below updates when count changes.
  return <button onClick={() => setCount(count() + 1)}>{count()}</button>;
}`,
  'tsx',
);

export default function WhyMikata() {
  useMeta({
    title: 'Why Mikata - Mikata',
    description: 'Learn the design goals, tradeoffs, and best fit for Mikata.',
  });

  return (
    <article>
      <h1>Why Mikata</h1>
      <p>
        Mikata is for teams that want JSX, TypeScript, and package-level
        composition without a virtual DOM runtime. Components set up DOM and
        reactive bindings once; signals carry updates directly to the places
        that read them.
      </p>

      <h2>Design goals</h2>
      <ul>
        <li>
          <strong>Precise updates.</strong> Signal reads become dependencies,
          so changing state updates the text, attribute, list, or branch that
          depends on it.
        </li>
        <li>
          <strong>Small mental model.</strong> Component functions run on mount.
          State changes do not re-enter the component body, so dependency arrays
          and stale render closures are not part of day-to-day work.
        </li>
        <li>
          <strong>Use only what you need.</strong> The <code>mikata</code>
          package re-exports the main stack, while focused packages such as{' '}
          <code>@mikata/reactivity</code>, <code>@mikata/router</code>, and{' '}
          <code>@mikata/ui</code> are available when a package boundary matters.
        </li>
        <li>
          <strong>Framework path when you want it.</strong> Start with a Vite
          app, add client routing, or choose Kit for file routes, SSR, metadata,
          and API routes.
        </li>
      </ul>
      <CodeBlock html={runOnce} />

      <h2>Tradeoffs</h2>
      <p>
        Mikata optimizes for compiled JSX and signal-driven DOM bindings. That
        makes updates direct, but it also means some React habits do not apply.
        Component bodies are setup functions, not render functions. Put reactive
        reads in JSX, <code>computed</code>, <code>effect</code>, or helpers
        such as <code>show</code> and <code>each</code>.
      </p>
      <p>
        The ecosystem is intentionally modular and still smaller than React,
        Vue, or Svelte. If your project depends on a large third-party component
        marketplace, a mature meta-framework ecosystem, or React-specific
        libraries, budget time for adapters or choose that ecosystem directly.
      </p>

      <h2>Good fits</h2>
      <ul>
        <li>Interactive dashboards, tools, and internal products.</li>
        <li>Apps that benefit from fine-grained updates and predictable state.</li>
        <li>Projects that want TypeScript-first JSX without virtual DOM diffing.</li>
        <li>SSR or static routes where Kit's file routes match the deployment.</li>
      </ul>

      <h2>When to choose something else</h2>
      <ul>
        <li>You need React-only libraries with no practical wrapper.</li>
        <li>Your team wants component functions to re-run on every update.</li>
        <li>You need a larger existing hiring, plugin, or design-system ecosystem.</li>
        <li>You are building mostly server-rendered HTML with very little client state.</li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/start/install">Installation</Link> gets a project running.
        </li>
        <li>
          <Link to="/start/choosing-packages">Choosing packages</Link> maps
          features to packages and scaffold flags.
        </li>
        <li>
          <Link to="/core/runtime">Components &amp; JSX</Link> explains the
          run-once component model in more depth.
        </li>
      </ul>
    </article>
  );
}
