import { createRequire } from 'node:module';
import { bench, describe } from 'vitest';
import { mikataJSXPlugin } from '../packages/compiler/src/transform';

let sink = 0;
const requireFromCompiler = createRequire(new URL('../packages/compiler/package.json', import.meta.url));
const { transformSync } = requireFromCompiler('@babel/core');
const syntaxTypescript = requireFromCompiler.resolve('@babel/plugin-syntax-typescript');

function transform(code: string): void {
  const result = transformSync(code, {
    filename: 'fixture.tsx',
    plugins: [
      [syntaxTypescript, { isTSX: true }],
      mikataJSXPlugin,
    ],
    sourceMaps: false,
  });
  sink += result?.code?.length ?? 0;
}

const simpleComponent = `
import { signal, computed } from '@mikata/reactivity';

export function Counter() {
  const [count, setCount] = signal(0);
  const doubled = computed(() => count() * 2);

  return (
    <section class="counter">
      <button onClick={() => setCount((n) => n - 1)}>-</button>
      <span>{count()}</span>
      <strong>{doubled()}</strong>
      <button onClick={() => setCount((n) => n + 1)}>+</button>
    </section>
  );
}
`;

const listComponent = `
export function List(props: { rows: Array<{ id: number; label: string; active: boolean }> }) {
  return (
    <ul class="rows">
      {props.rows.map((row) => (
        <li class={{ active: row.active }} data-id={row.id}>
          <span>{row.label}</span>
          <button onClick={() => console.log(row.id)}>Open</button>
        </li>
      ))}
    </ul>
  );
}
`;

const largeModule = Array.from({ length: 80 }, (_, index) => `
export function Row${index}(props: { value: number; selected: boolean }) {
  const label = props.selected ? 'Selected' : 'Idle';
  return (
    <article class={{ selected: props.selected, row: true }} data-index="${index}">
      <h2>Row ${index}</h2>
      <p>{label}</p>
      <button onClick={() => props.value}>Inspect</button>
    </article>
  );
}
`).join('\n');

describe('@mikata/compiler', () => {
  bench('transform simple component', () => {
    transform(simpleComponent);
  });

  bench('transform list component', () => {
    transform(listComponent);
  });

  bench('transform large module with 80 components', () => {
    transform(largeModule);
  });
});

void sink;
