import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Runtime & JSX', section: 'Core', order: 2 };

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

export default function Runtime() {
  useMeta({ title: 'Runtime & JSX - Mikata' });
  return (
    <article>
      <h1>Runtime & JSX</h1>

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
    </article>
  );
}
