import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Control flow', section: 'Core Concepts', order: 5 };

const showExample = await highlight(
  `import { show } from 'mikata';

{show(
  () => user(),
  (user) => <Profile user={user} />,
  () => <LoginPrompt />
)}`,
  'tsx',
);

const eachExample = await highlight(
  `import { each } from 'mikata';

<ul>
  {each(
    () => todos(),
    (todo, index) => <li>{index() + 1}. {todo.text}</li>,
    () => <li>No todos yet</li>,
    { key: (todo) => todo.id }
  )}
</ul>`,
  'tsx',
);

const staticEachExample = await highlight(
  `import { each } from 'mikata';

<ul>
  {each(
    () => menuItems,
    (item) => <li>{item.label}</li>,
    undefined,
    { key: (item) => item.id, static: true }
  )}
</ul>`,
  'tsx',
);

const switchExample = await highlight(
  `import { switchMatch, Dynamic } from 'mikata';

{switchMatch(
  () => status(),
  {
    loading: () => <Spinner />,
    error: () => <ErrorMessage />,
    success: () => <Results />,
    default: () => <Idle />,
  }
)}

<Dynamic component={currentPanel()} title="Settings" />`,
  'tsx',
);

export default function ControlFlow() {
  useMeta({
    title: 'Control flow - Mikata',
    description: 'Use show, each, switchMatch, and Dynamic for reactive branches and lists.',
  });

  return (
    <article>
      <h1>Control flow</h1>
      <p>
        Mikata uses functions for reactive control flow. They return DOM nodes,
        own their own scopes, and dispose effects inside removed branches or
        rows automatically.
      </p>

      <h2>Conditional branches</h2>
      <p>
        <code>show()</code> renders the main branch when the condition is truthy
        and an optional fallback otherwise. The truthy value is passed to the
        render callback for type narrowing.
      </p>
      <CodeBlock html={showExample} />
      <p>
        Pass <code>{'{ keepAlive: true }'}</code> when you want visited branches
        to stay mounted and toggle visibility instead of remounting.
      </p>

      <h2>Lists</h2>
      <p>
        <code>each()</code> reconciles a reactive list. Rows are keyed by item
        identity by default; pass <code>options.key</code> for stable ids when
        items are recreated from API responses.
      </p>
      <CodeBlock html={eachExample} />
      <p>
        The second argument receives an index signal. Call <code>index()</code>
        inside JSX when the visible row number should update after moves.
      </p>
      <p>
        Pass <code>{'{ static: true }'}</code> for lists that are mounted once
        and never reconciled. Static lists keep row cleanup scopes, but they do
        not subscribe to the list source or update when it changes.
      </p>
      <CodeBlock html={staticEachExample} />

      <h2>Switches and dynamic components</h2>
      <p>
        <code>switchMatch()</code> swaps one named case at a time.{' '}
        <code>Dynamic</code> is for component identity changes where the current
        component comes from state.
      </p>
      <CodeBlock html={switchExample} />

      <h2>Cleanup behavior</h2>
      <ul>
        <li>Changing a <code>show()</code> branch disposes the old branch scope.</li>
        <li>Removing an <code>each()</code> row disposes effects created by that row.</li>
        <li>Changing a <code>switchMatch()</code> case disposes the old case.</li>
        <li>
          <code>Dynamic</code> disposes the previous component scope when the
          component function changes.
        </li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/core/context">Context</Link> explains how provided values
          flow through dynamic subtrees.
        </li>
        <li>
          <Link to="/core/rendering">Rendering &amp; hydration</Link> covers the
          DOM handoff for SSR output.
        </li>
      </ul>
    </article>
  );
}
