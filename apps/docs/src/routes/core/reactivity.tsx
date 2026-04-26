import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';

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

export default function Reactivity() {
  useMeta({ title: 'Reactivity - Mikata' });
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
    </article>
  );
}
