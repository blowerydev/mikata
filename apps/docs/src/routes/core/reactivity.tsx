import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';
import { Link } from '@mikata/router';

export const nav = { title: 'Reactivity', section: 'Core Concepts', order: 1 };

const signalExample = await highlight(
  `import { signal } from '@mikata/reactivity';

const [count, setCount] = signal(0);

count();          // 0
setCount(1);
count();          // 1
setCount((n) => n + 1);
count();          // 2`,
  'tsx',
);

const computedExample = await highlight(
  `import { signal, computed } from '@mikata/reactivity';

const [items, setItems] = signal<number[]>([1, 2, 3]);
const total = computed(() => items().reduce((a, b) => a + b, 0));

total();          // 6
setItems([1, 2, 3, 4]);
total();          // 10`,
  'tsx',
);

const effectExample = await highlight(
  `import { signal, effect } from '@mikata/reactivity';

const [name, setName] = signal('world');

effect(() => {
  console.log('hello,', name());
});

setName('mikata');
// logs: hello, mikata`,
  'tsx',
);

const batchExample = await highlight(
  `import { signal, effect, batch } from '@mikata/reactivity';

const [a, setA] = signal(1);
const [b, setB] = signal(2);

effect(() => console.log(a() + b()));
// logs: 3

batch(() => {
  setA(10);
  setB(20);
});
// logs once: 30 - not twice`,
  'tsx',
);
const cleanupExample = await highlight(
  `import { effect, onCleanup } from '@mikata/reactivity';

effect(() => {
  const controller = new AbortController();
  fetch('/api/search', { signal: controller.signal });

  return () => controller.abort();
});

onCleanup(() => console.log('component or scope disposed'));`,
  'tsx',
);
const selectorExample = await highlight(
  `import { signal, createSelector } from '@mikata/reactivity';

const [activeId, setActiveId] = signal('home');
const isActive = createSelector(activeId);

// A row that reads isActive(id) only re-runs when it enters or leaves
// the selected state, not every time activeId changes.
<a class={{ active: isActive(item.id) }}>{item.label}</a>;`,
  'tsx',
);
const reactiveExample = await highlight(
  `import { reactive, effect, toRaw } from '@mikata/reactivity';

const state = reactive({ user: { name: 'Ada' }, items: ['docs'] });

effect(() => {
  console.log(state.user.name, state.items.length);
});

state.user.name = 'Grace';
state.items.push('api');

const plain = toRaw(state);`,
  'tsx',
);

export default function Reactivity() {
  useMeta({
    title: 'Reactivity - Mikata',
    description: 'Signals, computed values, effects, scopes, batching, and reactive objects.',
  });

  return (
    <article>
      <h1>Reactivity</h1>
      <p>
        <code>@mikata/reactivity</code> is the signal runtime the rest of
        the framework is built on. There are three primitives: signals,
        computeds, and effects.
      </p>

      <h2>Signals</h2>
      <p>
        A signal holds a value and tracks every read. Call the getter to
        read; call the setter to write.
      </p>
      <CodeBlock html={signalExample} />

      <h2>Computed</h2>
      <p>
        <code>computed</code> returns a read-only getter whose value is
        derived from other signals. It only re-runs when a read
        dependency changes, and it's memoized - reading a computed twice
        in a row doesn't recompute.
      </p>
      <CodeBlock html={computedExample} />

      <h2>Effects</h2>
      <p>
        Effects run side effects when their tracked signals change.
        They run once on creation, then again whenever a dependency
        fires.
      </p>
      <CodeBlock html={effectExample} />

      <h2>Batching</h2>
      <p>
        Multiple writes inside <code>batch()</code> collapse into a single
        notification, so effects run once with the final state.
      </p>
      <CodeBlock html={batchExample} />

      <h2>Cleanup and scopes</h2>
      <p>
        Components and control-flow branches create reactive scopes. Effects
        created inside a scope are disposed with it. An effect may return a
        cleanup function, and <code>onCleanup()</code> registers teardown on the
        current scope.
      </p>
      <CodeBlock html={cleanupExample} />

      <h2>Selectors</h2>
      <p>
        <code>createSelector()</code> is for equality checks shared across many
        rows, tabs, or links. It avoids re-running every subscriber when only
        the old and new selected keys changed.
      </p>
      <CodeBlock html={selectorExample} />

      <h2>Reactive objects</h2>
      <p>
        <code>reactive()</code> creates a deep proxy for object and array state.
        Property reads are tracked, nested objects are wrapped lazily, and array
        mutators notify the affected keys and iteration consumers.
      </p>
      <CodeBlock html={reactiveExample} />

      <h2>Utilities and caveats</h2>
      <ul>
        <li>
          Use <code>untrack()</code> when an effect or computed needs to read a
          value without subscribing to it.
        </li>
        <li>
          Use <code>on(source, fn)</code> for an effect body that should react
          to one explicit source.
        </li>
        <li>
          Keep <code>computed()</code> pure. Writing to signals or reactive
          objects inside a computed is a bug.
        </li>
        <li>
          Use <code>flushSync()</code> in tests when you need scheduled reactive
          work to finish before assertions.
        </li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/core/runtime">Components &amp; JSX</Link> shows how JSX
          turns signal reads into DOM updates.
        </li>
        <li>
          <Link to="/state/stores">Stores</Link> covers larger app state
          patterns.
        </li>
      </ul>
    </article>
  );
}
