import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Rendering & hydration', section: 'Core Concepts', order: 4 };

const renderExample = await highlight(
  `import { render } from 'mikata';
import { App } from './App';

const dispose = render(() => <App />, document.getElementById('app')!);

// Later, if you need to unmount manually:
dispose();`,
  'tsx',
);

const hydrateExample = await highlight(
  `import { hydrate } from 'mikata';
import { App } from './App';

const dispose = await hydrate(
  () => <App />,
  document.getElementById('root')!,
  { defer: 'css' }
);`,
  'tsx',
);

export default function Rendering() {
  useMeta({
    title: 'Rendering & hydration - Mikata',
    description: 'Mount client apps with render and hydrate server-rendered DOM.',
  });

  return (
    <article>
      <h1>Rendering &amp; hydration</h1>
      <p>
        <code>render()</code> mounts a fresh client tree. <code>hydrate()</code>
        adopts server-rendered DOM and wires events and reactive bindings onto
        the nodes that are already on the page.
      </p>

      <h2>Client rendering</h2>
      <p>
        <code>render()</code> clears the target container, creates a root scope,
        appends the returned DOM node, and returns a dispose function that tears
        down effects and clears the container.
      </p>
      <CodeBlock html={renderExample} />

      <h2>Hydration</h2>
      <p>
        <code>hydrate()</code> does not clear the container. It starts an
        adoption cursor over the existing DOM, then the compiled JSX asks for
        the next node as it rebuilds the component tree. Event listeners and
        effects attach to the adopted nodes.
      </p>
      <CodeBlock html={hydrateExample} />

      <h2>Deferred hydration</h2>
      <p>
        Pass <code>defer</code> when the client should wait before walking the
        SSR DOM. <code>'css'</code> waits for stylesheets, <code>'load'</code>
        waits for the window load event, and <code>'idle'</code> waits for idle
        time. You can also provide a custom readiness function.
      </p>

      <h2>Client and server boundaries</h2>
      <ul>
        <li>Use <code>render()</code> for purely client-rendered Vite apps.</li>
        <li>Use <code>hydrate()</code> only when the container already contains matching SSR output.</li>
        <li>Browser-only work belongs in <code>onMount()</code>, which is skipped during SSR.</li>
        <li>Keep server and client trees structurally identical for hydrated routes.</li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/routing/kit">Kit overview</Link> shows how Kit wraps
          server rendering and hydration.
        </li>
        <li>
          <Link to="/app/ssr-ssg">SSR, SSG, adapters</Link> covers deploy
          modes and cache behavior.
        </li>
      </ul>
    </article>
  );
}
