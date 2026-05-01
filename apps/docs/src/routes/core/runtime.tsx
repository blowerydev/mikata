import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';
import { Link } from '@mikata/router';

export const nav = { title: 'Components & JSX', section: 'Core Concepts', order: 2 };

const setupExample = await highlight(
  `function Counter() {
  const [count, setCount] = signal(0);

  // This console.log runs EXACTLY ONCE, when the component mounts.
  console.log('Counter setup');

  return <button onClick={() => setCount(count() + 1)}>{count()}</button>;
}`,
  'tsx',
);

const controlFlowExample = await highlight(
  `import { show, each } from '@mikata/runtime';

function UserList({ users }: { users: () => User[] }) {
  return (
    <div>
      {show(
        () => users().length === 0,
        () => <p>No users</p>,
        () => (
          <ul>
            {each(users, (user) => <li>{user.name}</li>)}
          </ul>
        )
      )}
    </div>
  );
}`,
  'tsx',
);

const jsxExample = await highlight(
  `<div class="card">{user().name}</div>

// ... compiled to roughly ...

const _el = _template('<div class="card"></div>');
const _node = _el.firstChild;
renderEffect(() => { _node.textContent = user().name; });`,
  'tsx',
);
const lifecycleExample = await highlight(
  `import { createRef, onMount, onCleanup } from 'mikata';

function SearchBox() {
  const input = createRef<HTMLInputElement>();

  onMount(() => input.current?.focus());
  onCleanup(() => console.log('SearchBox disposed'));

  return <input ref={input} placeholder="Search" />;
}`,
  'tsx',
);
const propsExample = await highlight(
  `function Badge(props: { label: string; tone?: 'info' | 'danger' }) {
  return <span class={['badge', props.tone ?? 'info']}>{props.label}</span>;
}

<Badge label="New" tone="info" />
<>
  <Badge label="A" />
  <Badge label="B" />
</>`,
  'tsx',
);

export default function Runtime() {
  useMeta({
    title: 'Components & JSX - Mikata',
    description: 'Understand Mikata components, JSX, lifecycle hooks, refs, props, and events.',
  });

  return (
    <article>
      <h1>Components & JSX</h1>

      <h2>Components run once</h2>
      <p>
        This is the single most important thing to internalize: a Mikata
        component function runs <strong>once</strong>, on mount.
        Re-running the component on update - the cornerstone of
        React-style frameworks - is not how Mikata works. Updates happen
        at the signal level; the JSX sets up reactive bindings once and
        they drive the DOM from there.
      </p>
      <CodeBlock html={setupExample} />
      <p>
        This means effects, event handlers, and derived values defined
        inside the component close over stable references - no stale
        closures, no dependency arrays.
      </p>

      <h2>Lifecycle and refs</h2>
      <p>
        Components receive a reactive scope. Effects and cleanups created during
        setup are tied to that scope. Use <code>onMount()</code> for browser DOM
        work after insertion, <code>onCleanup()</code> for teardown, and{' '}
        <code>createRef()</code> for DOM references.
      </p>
      <CodeBlock html={lifecycleExample} />

      <h2>Props, events, and fragments</h2>
      <p>
        Props are plain readonly objects. Event handlers receive native DOM
        events, so <code>event.currentTarget</code> is the element you attached
        the handler to. Fragments group sibling nodes without adding a wrapper.
      </p>
      <CodeBlock html={propsExample} />

      <h2>Control flow</h2>
      <p>
        Use <code>show()</code> for conditional branches and{' '}
        <code>each()</code> for lists. They keep the surrounding tree
        stable and only rebuild the affected subtree when their input
        signal changes.
      </p>
      <CodeBlock html={controlFlowExample} />

      <h2>No virtual DOM</h2>
      <p>
        <code>@mikata/compiler</code> transforms JSX into template
        strings, cached DOM nodes, and targeted <code>renderEffect</code>
        {' '}
        bindings for any reactive expression. The generated code looks
        roughly like this:
      </p>
      <CodeBlock html={jsxExample} />
      <p>
        The result: no reconciler, no component re-execution, no diffing.
        Updates touch the one node that actually changed.
      </p>

      <h2>JSX constraints</h2>
      <ul>
        <li>Use <code>class</code> instead of <code>className</code>.</li>
        <li>Use native event names such as <code>onClick</code> and <code>onInput</code>.</li>
        <li>Put changing reads in JSX, effects, computed values, or control-flow callbacks.</li>
        <li>Return a DOM node or fragment from every component.</li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/core/compiler">JSX &amp; compiler</Link> explains how JSX
          is transformed.
        </li>
        <li>
          <Link to="/core/rendering">Rendering &amp; hydration</Link> covers
          mounting and SSR handoff.
        </li>
      </ul>
    </article>
  );
}
