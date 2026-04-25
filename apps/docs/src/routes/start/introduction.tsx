import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';
import { Link } from '@mikata/router';

export const nav = { title: 'Introduction', section: 'Start', order: 1 };

const mentalModel = await highlight(
  `import { signal, computed } from 'mikata';

const [count, setCount] = signal(0);
const doubled = computed(() => count() * 2);

// Call the getter to read. Call the setter to write.
// The signal tracks reads automatically - no dependency arrays.
`,
  'tsx',
);

export default function Introduction() {
  useMeta({ title: 'Introduction - Mikata' });
  return (
    <article>
      <h1>Introduction</h1>
      <p>
        Mikata is a UI framework built on three ideas: <strong>signals</strong>,
        <strong> no virtual DOM</strong>, and <strong>components that run
        exactly once</strong>. Together they add up to code that's easier to
        write, cheaper to run, and simpler to reason about.
      </p>
      <h2>Signals, not re-renders</h2>
      <p>
        State lives in signals. When a signal changes, Mikata updates the
        exact DOM nodes that read it - no component re-renders, no diffing,
        no stale closures. The component function runs once on mount and
        never again. That's it.
      </p>
      <CodeBlock html={mentalModel} />
      <h2>JSX, compiled</h2>
      <p>
        Mikata's JSX is transformed at build time into real DOM operations
        by <code>@mikata/compiler</code>. There is no virtual DOM. Writing a
        reactive expression like <code>{'{count()}'}</code> in JSX creates a
        surgical binding that only updates that text node when the signal
        fires.
      </p>
      <h2>Where to next</h2>
      <ul>
        <li>
          <Link to="/start/install">Install</Link> - bootstrap a new app with
          <code> create-mikata</code>.
        </li>
        <li>
          <Link to="/start/first-app">Your first app</Link> - a working todo
          list in one file.
        </li>
        <li>
          <Link to="/core/reactivity">Reactivity</Link> - signals, computed,
          effects in depth.
        </li>
      </ul>
    </article>
  );
}
