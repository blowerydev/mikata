import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { JSDOM } from 'jsdom';

type Mode = 'realistic' | 'stress';

interface BenchCase {
  framework: string;
  category: string;
  name: string;
  mode: Mode;
  fn: () => void | Promise<void>;
  cleanup?: () => void | Promise<void>;
  note?: string;
}

interface BenchResult {
  framework: string;
  category: string;
  name: string;
  mode: Mode;
  hz: number;
  medianMs: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  samples: number;
  relativeToMikata?: number;
  note?: string;
}

interface Options {
  quick: boolean;
  list: boolean;
  jsonPath?: string;
  frameworks?: Set<string>;
  categories?: Set<string>;
  modes?: Set<Mode>;
}

const options = parseOptions(process.argv.slice(2));
const missingFrameworks: string[] = [];
let sink = 0;

Object.assign(globalThis, {
  __DEV__: false,
});

installDom();

const allCases = await collectCases();
const cases = allCases.filter((benchCase) => {
  if (options.frameworks && !options.frameworks.has(benchCase.framework)) return false;
  if (options.categories && !options.categories.has(benchCase.category)) return false;
  if (options.modes && !options.modes.has(benchCase.mode)) return false;
  return true;
});

if (options.list) {
  printCaseList(cases);
  printSkipped();
  process.exit(0);
}

if (cases.length === 0) {
  console.error('No benchmark cases matched the requested filters.');
  printSkipped();
  process.exit(1);
}

console.log(`Running ${cases.length} framework benchmark case(s)${options.quick ? ' in quick mode' : ''}...\n`);

const results: BenchResult[] = [];
for (const benchCase of cases) {
  process.stdout.write(`${benchCase.framework.padEnd(8)} ${benchCase.category.padEnd(14)} ${benchCase.name} ... `);
  try {
    const result = await measureCase(benchCase, options);
    results.push(result);
    console.log(`${formatNumber(result.hz)} scenario/s`);
  } finally {
    await benchCase.cleanup?.();
  }
}

addMikataRelatives(results);
printResults(results);
printSkipped();

if (options.jsonPath) {
  const outputPath = resolve(options.jsonPath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      quick: options.quick,
      results,
      skippedFrameworks: missingFrameworks,
    }, null, 2)}\n`,
  );
  console.log(`\nWrote ${outputPath}`);
}

void sink;

function parseOptions(args: string[]): Options {
  const parsed: Options = { quick: false, list: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--quick') {
      parsed.quick = true;
    } else if (arg === '--') {
      continue;
    } else if (arg === '--list') {
      parsed.list = true;
    } else if (arg === '--json') {
      parsed.jsonPath = args[++i];
    } else if (arg.startsWith('--json=')) {
      parsed.jsonPath = arg.slice('--json='.length);
    } else if (arg === '--framework') {
      parsed.frameworks = csvSet(args[++i]);
    } else if (arg.startsWith('--framework=')) {
      parsed.frameworks = csvSet(arg.slice('--framework='.length));
    } else if (arg === '--category') {
      parsed.categories = csvSet(args[++i]);
    } else if (arg.startsWith('--category=')) {
      parsed.categories = csvSet(arg.slice('--category='.length));
    } else if (arg === '--mode') {
      parsed.modes = csvSet(args[++i]) as Set<Mode>;
    } else if (arg.startsWith('--mode=')) {
      parsed.modes = csvSet(arg.slice('--mode='.length)) as Set<Mode>;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

function csvSet(value: string | undefined): Set<string> {
  if (!value) throw new Error('Expected a comma-separated value.');
  return new Set(value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function installDom(): void {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    pretendToBeVisual: true,
    url: 'http://localhost/',
  });
  const win = dom.window;
  Object.assign(globalThis, {
    window: win,
    document: win.document,
    Node: win.Node,
    Text: win.Text,
    HTMLElement: win.HTMLElement,
    SVGElement: win.SVGElement,
    Element: win.Element,
    DocumentFragment: win.DocumentFragment,
    Comment: win.Comment,
    MutationObserver: win.MutationObserver,
    requestAnimationFrame: win.requestAnimationFrame.bind(win),
    cancelAnimationFrame: win.cancelAnimationFrame.bind(win),
  });
}

async function collectCases(): Promise<BenchCase[]> {
  const groups = await Promise.all([
    mikataCases(),
    reactCases(),
    vueCases(),
    solidCases(),
    svelteCases(),
  ]);
  return groups.flat().sort((a, b) => {
    const scenario = `${a.category}:${a.name}`.localeCompare(`${b.category}:${b.name}`);
    return scenario || a.framework.localeCompare(b.framework);
  });
}

async function measureCase(benchCase: BenchCase, opts: Options): Promise<BenchResult> {
  const warmupMs = opts.quick ? 35 : 150;
  const targetMs = opts.quick ? 120 : 650;
  const minSamples = opts.quick ? 6 : 14;
  const maxSamples = opts.quick ? 20 : 45;

  await runFor(benchCase.fn, warmupMs);

  const samples: number[] = [];
  const startedAt = performance.now();
  while (
    (performance.now() - startedAt < targetMs || samples.length < minSamples) &&
    samples.length < maxSamples
  ) {
    const start = performance.now();
    await benchCase.fn();
    samples.push(performance.now() - start);
  }

  samples.sort((a, b) => a - b);
  const meanMs = samples.reduce((total, value) => total + value, 0) / samples.length;
  const medianMs = percentile(samples, 0.5);
  return {
    framework: benchCase.framework,
    category: benchCase.category,
    name: benchCase.name,
    mode: benchCase.mode,
    hz: 1000 / medianMs,
    medianMs,
    meanMs,
    minMs: samples[0],
    maxMs: samples[samples.length - 1],
    samples: samples.length,
    note: benchCase.note,
  };
}

async function runFor(fn: BenchCase['fn'], ms: number): Promise<void> {
  const startedAt = performance.now();
  do {
    await fn();
  } while (performance.now() - startedAt < ms);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[index];
}

function addMikataRelatives(results: BenchResult[]): void {
  const mikataByScenario = new Map<string, BenchResult>();
  for (const result of results) {
    if (result.framework === 'mikata') {
      mikataByScenario.set(scenarioKey(result), result);
    }
  }

  for (const result of results) {
    const mikata = mikataByScenario.get(scenarioKey(result));
    if (mikata && mikata.hz > 0) {
      result.relativeToMikata = result.hz / mikata.hz;
    }
  }
}

function scenarioKey(result: Pick<BenchResult, 'category' | 'name'>): string {
  return `${result.category}\0${result.name}`;
}

function printCaseList(cases: BenchCase[]): void {
  for (const benchCase of cases) {
    console.log(`${benchCase.framework.padEnd(8)} ${benchCase.mode.padEnd(9)} ${benchCase.category.padEnd(14)} ${benchCase.name}`);
  }
}

function printResults(results: BenchResult[]): void {
  console.log('\nResults');
  console.log('framework  mode       category        scenario                              scenario/s  vs mikata  median ms');
  console.log('---------  ---------  --------------  ------------------------------------  ----------  ---------  ---------');
  for (const result of results) {
    console.log([
      result.framework.padEnd(9),
      result.mode.padEnd(9),
      result.category.padEnd(14),
      result.name.slice(0, 36).padEnd(36),
      formatNumber(result.hz).padStart(10),
      formatRelative(result.relativeToMikata).padStart(9),
      result.medianMs.toFixed(3).padStart(9),
    ].join('  '));
  }
}

function printSkipped(): void {
  if (missingFrameworks.length === 0) return;
  console.log(`\nSkipped: ${missingFrameworks.join(', ')}`);
  console.log('Install optional comparison dependencies with: pnpm --dir bench/frameworks install');
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: value < 100 ? 2 : 0 }).format(value);
}

function formatRelative(value: number | undefined): string {
  if (value == null) return '-';
  return value === 1 ? '1.00x' : `${value.toFixed(2)}x`;
}

async function tryImport<T>(framework: string, specifier: string, recordMissing = true): Promise<T | null> {
  try {
    return await import(specifier) as T;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
      if (recordMissing && !missingFrameworks.includes(framework)) missingFrameworks.push(framework);
      return null;
    }
    throw error;
  }
}

function createRows(count: number): Array<{ id: number; label: string }> {
  return Array.from({ length: count }, (_, id) => ({ id, label: `Row ${id}` }));
}

function createStaticCard(): HTMLElement {
  const article = document.createElement('article');
  const heading = document.createElement('h2');
  const paragraph = document.createElement('p');
  const button = document.createElement('button');
  heading.textContent = 'Revenue by region';
  paragraph.textContent = 'A dense card with labels, values, and actions.';
  button.textContent = 'Open';
  article.append(heading, paragraph, button);
  return article;
}

async function mikataCases(): Promise<BenchCase[]> {
  const reactivity = await import('../../packages/reactivity/dist/index.js');
  const runtime = await import('../../packages/runtime/dist/index.js');
  const server = await import('../../packages/server/dist/index.js');
  const rows = createRows(300);
  const reversed = [...rows].reverse();

  const textContainer = document.createElement('div');
  const [textValue, setTextValue] = reactivity.signal(0);
  const disposeText = runtime.render(() => {
    const node = runtime._template('<p> </p>').cloneNode(true) as HTMLElement;
    runtime._insert(node, () => String(textValue()));
    return node;
  }, textContainer);

  const listContainer = document.createElement('div');
  const [items, setItems] = reactivity.signal(rows);
  let listReversed = false;
  const disposeList = runtime.render(() => {
    const root = runtime._template('<ul></ul>').cloneNode(true) as HTMLElement;
    runtime._insert(
      root,
      () => runtime.each(items, (item: { id: number; label: string }) => {
        const li = runtime._template('<li> </li>').cloneNode(true) as HTMLElement;
        li.firstChild!.textContent = item.label;
        return li;
      }, undefined, { key: (item: { id: number }) => item.id }),
    );
    return root;
  }, listContainer);

  const toggleContainer = document.createElement('div');
  const [visible, setVisible] = reactivity.signal(true);
  const disposeToggle = runtime.render(() => {
    const root = runtime._template('<section></section>').cloneNode(true) as HTMLElement;
    runtime._insert(
      root,
      () => runtime.show(
        visible,
        () => runtime._template('<strong>Expanded content</strong>').cloneNode(true),
        () => runtime._template('<em>Collapsed content</em>').cloneNode(true),
      ),
    );
    return root;
  }, toggleContainer);

  const keepAliveToggleContainer = document.createElement('div');
  const [keepAliveVisible, setKeepAliveVisible] = reactivity.signal(true);
  const disposeKeepAliveToggle = runtime.render(() => {
    const root = runtime._template('<section></section>').cloneNode(true) as HTMLElement;
    runtime._insert(
      root,
      () => runtime.show(
        keepAliveVisible,
        () => runtime._template('<strong>Expanded content</strong>').cloneNode(true),
        () => runtime._template('<em>Collapsed content</em>').cloneNode(true),
        { keepAlive: true },
      ),
    );
    return root;
  }, keepAliveToggleContainer);

  const [fanoutValue, setFanoutValue] = reactivity.signal(0);
  let fanoutRuns = 0;
  const fanoutScope = reactivity.createScope(() => {
    for (let i = 0; i < 1_000; i++) {
      reactivity.effect(() => {
        fanoutRuns += fanoutValue();
      });
    }
  });

  const [chainSource, setChainSource] = reactivity.signal(0);
  let chainValue = reactivity.computed(() => chainSource());
  const chainScope = reactivity.createScope(() => {
    for (let i = 0; i < 100; i++) {
      const prev = chainValue;
      chainValue = reactivity.computed(() => prev() + 1);
    }
  });

  return [
    {
      framework: 'mikata',
      category: 'dom-mount',
      name: 'mount static card 100x',
      mode: 'realistic',
      fn: () => {
        const container = document.createElement('div');
        for (let i = 0; i < 100; i++) {
          const dispose = runtime.render(() => createStaticCard(), container);
          dispose();
        }
        sink += container.childNodes.length;
      },
    },
    {
      framework: 'mikata',
      category: 'dom-update',
      name: 'update text binding 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setTextValue((value: number) => value + 1);
          reactivity.flushSync();
        }
        sink += textContainer.textContent?.length ?? 0;
      },
      cleanup: disposeText,
    },
    {
      framework: 'mikata',
      category: 'dom-update',
      name: 'reverse keyed list of 300 rows 50x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 50; i++) {
          listReversed = !listReversed;
          setItems(listReversed ? reversed : rows);
          reactivity.flushSync();
        }
        sink += listContainer.textContent?.length ?? 0;
      },
      cleanup: disposeList,
    },
    {
      framework: 'mikata',
      category: 'dom-update',
      name: 'toggle conditional branch 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setVisible((value: boolean) => !value);
          reactivity.flushSync();
        }
        sink += toggleContainer.textContent?.length ?? 0;
      },
      cleanup: disposeToggle,
    },
    {
      framework: 'mikata',
      category: 'dom-update',
      name: 'toggle keepAlive branch 250x',
      mode: 'realistic',
      note: 'Retained-branch Mikata comparison for hot visibility toggles.',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setKeepAliveVisible((value: boolean) => !value);
          reactivity.flushSync();
        }
        sink += keepAliveToggleContainer.textContent?.length ?? 0;
      },
      cleanup: disposeKeepAliveToggle,
    },
    {
      framework: 'mikata',
      category: 'reactivity',
      name: 'notify 1k subscribers',
      mode: 'stress',
      fn: () => {
        setFanoutValue((value: number) => value + 1);
        reactivity.flushSync();
        sink += fanoutRuns;
      },
      cleanup: () => fanoutScope.dispose(),
    },
    {
      framework: 'mikata',
      category: 'reactivity',
      name: 'invalidate 100 derived chain',
      mode: 'stress',
      fn: () => {
        setChainSource((value: number) => value + 1);
        sink += chainValue();
      },
      cleanup: () => chainScope.dispose(),
    },
    {
      framework: 'mikata',
      category: 'ssr',
      name: 'render keyed list of 300 rows',
      mode: 'realistic',
      fn: async () => {
        const { html } = await server.renderToString(() => {
          let out = '<ul>';
          for (const item of rows) {
            out += `<li>${server.escapeText(item.label)}</li>`;
          }
          return out + '</ul>';
        }, { skipQueryCollection: true });
        sink += html.length;
      },
    },
  ];
}

async function reactCases(): Promise<BenchCase[]> {
  const React = await tryImport<any>('react', 'react');
  const ReactDOMClient = await tryImport<any>('react', 'react-dom/client');
  const ReactDOM = await tryImport<any>('react', 'react-dom');
  const ReactDOMServer = await tryImport<any>('react', 'react-dom/server');
  if (!React || !ReactDOMClient || !ReactDOM || !ReactDOMServer) return [];

  const h = React.createElement;
  const rows = createRows(300);
  const reversed = [...rows].reverse();

  function StaticCard(): unknown {
    return h('article', null, h('h2', null, 'Revenue by region'), h('p', null, 'A dense card with labels, values, and actions.'), h('button', null, 'Open'));
  }

  let setTextValue!: (value: number | ((value: number) => number)) => void;
  const textContainer = document.createElement('div');
  const textRoot = ReactDOMClient.createRoot(textContainer);
  function TextApp(): unknown {
    const [value, setValue] = React.useState(0);
    setTextValue = setValue;
    return h('p', null, value);
  }
  ReactDOM.flushSync(() => textRoot.render(h(TextApp)));

  let setItems!: (value: Array<{ id: number; label: string }>) => void;
  let listReversed = false;
  const listContainer = document.createElement('div');
  const listRoot = ReactDOMClient.createRoot(listContainer);
  function ListApp(): unknown {
    const [items, updateItems] = React.useState(rows);
    setItems = updateItems;
    return h('ul', null, items.map((item) => h('li', { key: item.id }, item.label)));
  }
  ReactDOM.flushSync(() => listRoot.render(h(ListApp)));

  let setVisible!: (value: boolean | ((value: boolean) => boolean)) => void;
  const toggleContainer = document.createElement('div');
  const toggleRoot = ReactDOMClient.createRoot(toggleContainer);
  function ToggleApp(): unknown {
    const [visible, updateVisible] = React.useState(true);
    setVisible = updateVisible;
    return h('section', null, visible ? h('strong', null, 'Expanded content') : h('em', null, 'Collapsed content'));
  }
  ReactDOM.flushSync(() => toggleRoot.render(h(ToggleApp)));

  let setFanout!: (value: number | ((value: number) => number)) => void;
  const fanoutContainer = document.createElement('div');
  const fanoutRoot = ReactDOMClient.createRoot(fanoutContainer);
  function FanoutApp(): unknown {
    const [value, updateValue] = React.useState(0);
    setFanout = updateValue;
    return h('div', null, Array.from({ length: 1_000 }, (_, index) => h('span', { key: index }, value)));
  }
  ReactDOM.flushSync(() => fanoutRoot.render(h(FanoutApp)));

  return [
    {
      framework: 'react',
      category: 'dom-mount',
      name: 'mount static card 100x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const root = ReactDOMClient.createRoot(container);
          ReactDOM.flushSync(() => root.render(h(StaticCard)));
          root.unmount();
          sink += container.childNodes.length;
        }
      },
    },
    {
      framework: 'react',
      category: 'dom-update',
      name: 'update text binding 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          ReactDOM.flushSync(() => setTextValue((value) => value + 1));
        }
        sink += textContainer.textContent?.length ?? 0;
      },
      cleanup: () => textRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'dom-update',
      name: 'reverse keyed list of 300 rows 50x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 50; i++) {
          listReversed = !listReversed;
          ReactDOM.flushSync(() => setItems(listReversed ? reversed : rows));
        }
        sink += listContainer.textContent?.length ?? 0;
      },
      cleanup: () => listRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'dom-update',
      name: 'toggle conditional branch 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          ReactDOM.flushSync(() => setVisible((value) => !value));
        }
        sink += toggleContainer.textContent?.length ?? 0;
      },
      cleanup: () => toggleRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'reactivity',
      name: 'notify 1k subscribers',
      mode: 'stress',
      note: 'React comparison uses 1k child component consumers instead of signal subscribers.',
      fn: () => {
        ReactDOM.flushSync(() => setFanout((value) => value + 1));
        sink += fanoutContainer.textContent?.length ?? 0;
      },
      cleanup: () => fanoutRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'ssr',
      name: 'render keyed list of 300 rows',
      mode: 'realistic',
      fn: () => {
        const html = ReactDOMServer.renderToString(h('ul', null, rows.map((item) => h('li', { key: item.id }, item.label))));
        sink += html.length;
      },
    },
  ];
}

async function vueCases(): Promise<BenchCase[]> {
  const Vue = await tryImport<any>('vue', 'vue');
  if (!Vue) return [];
  const VueServer = await tryImport<any>('vue', '@vue/server-renderer');
  const rows = createRows(300);
  const reversed = [...rows].reverse();

  const textValue = Vue.ref(0);
  const textContainer = document.createElement('div');
  const textApp = Vue.createApp({ setup: () => () => Vue.h('p', String(textValue.value)) });
  textApp.mount(textContainer);

  const items = Vue.ref(rows);
  let listReversed = false;
  const listContainer = document.createElement('div');
  const listApp = Vue.createApp({
    setup: () => () => Vue.h('ul', items.value.map((item: { id: number; label: string }) => Vue.h('li', { key: item.id }, item.label))),
  });
  listApp.mount(listContainer);

  const visible = Vue.ref(true);
  const toggleContainer = document.createElement('div');
  const toggleApp = Vue.createApp({
    setup: () => () => Vue.h('section', visible.value ? Vue.h('strong', 'Expanded content') : Vue.h('em', 'Collapsed content')),
  });
  toggleApp.mount(toggleContainer);

  const fanout = Vue.ref(0);
  let fanoutRuns = 0;
  const fanoutScope = Vue.effectScope();
  fanoutScope.run(() => {
    for (let i = 0; i < 1_000; i++) {
      Vue.watchEffect(() => {
        fanoutRuns += fanout.value;
      }, { flush: 'sync' });
    }
  });

  const chainSource = Vue.ref(0);
  const chainScope = Vue.effectScope();
  let chainValue: any;
  chainScope.run(() => {
    chainValue = Vue.computed(() => chainSource.value);
    for (let i = 0; i < 100; i++) {
      const prev = chainValue;
      chainValue = Vue.computed(() => prev.value + 1);
    }
  });

  const cases: BenchCase[] = [
    {
      framework: 'vue',
      category: 'dom-mount',
      name: 'mount static card 100x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const app = Vue.createApp({ render: () => Vue.h('article', [Vue.h('h2', 'Revenue by region'), Vue.h('p', 'A dense card with labels, values, and actions.'), Vue.h('button', 'Open')]) });
          app.mount(container);
          app.unmount();
          sink += container.childNodes.length;
        }
      },
    },
    {
      framework: 'vue',
      category: 'dom-update',
      name: 'update text binding 250x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 250; i++) {
          textValue.value += 1;
          await Vue.nextTick();
        }
        sink += textContainer.textContent?.length ?? 0;
      },
      cleanup: () => textApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'dom-update',
      name: 'reverse keyed list of 300 rows 50x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 50; i++) {
          listReversed = !listReversed;
          items.value = listReversed ? reversed : rows;
          await Vue.nextTick();
        }
        sink += listContainer.textContent?.length ?? 0;
      },
      cleanup: () => listApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'dom-update',
      name: 'toggle conditional branch 250x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 250; i++) {
          visible.value = !visible.value;
          await Vue.nextTick();
        }
        sink += toggleContainer.textContent?.length ?? 0;
      },
      cleanup: () => toggleApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'reactivity',
      name: 'notify 1k subscribers',
      mode: 'stress',
      fn: () => {
        fanout.value += 1;
        sink += fanoutRuns;
      },
      cleanup: () => fanoutScope.stop(),
    },
    {
      framework: 'vue',
      category: 'reactivity',
      name: 'invalidate 100 derived chain',
      mode: 'stress',
      fn: () => {
        chainSource.value += 1;
        sink += chainValue.value;
      },
      cleanup: () => chainScope.stop(),
    },
  ];

  if (VueServer) {
    cases.push({
      framework: 'vue',
      category: 'ssr',
      name: 'render keyed list of 300 rows',
      mode: 'realistic',
      fn: async () => {
        const app = Vue.createSSRApp({
          render: () => Vue.h('ul', rows.map((item) => Vue.h('li', { key: item.id }, item.label))),
        });
        const html = await VueServer.renderToString(app);
        sink += html.length;
      },
    });
  }

  return cases;
}

async function solidCases(): Promise<BenchCase[]> {
  const Solid = await tryImport<any>('solid', './node_modules/solid-js/dist/solid.js', false)
    ?? await tryImport<any>('solid', 'solid-js');
  const SolidWeb = await tryImport<any>('solid', './node_modules/solid-js/web/dist/web.js', false)
    ?? await tryImport<any>('solid', 'solid-js/web');
  if (!Solid || !SolidWeb) return [];
  const rows = createRows(300);
  const reversed = [...rows].reverse();

  const textContainer = document.createElement('div');
  let setTextValue!: (value: number | ((value: number) => number)) => void;
  const disposeText = SolidWeb.render(() => {
    const [value, setValue] = Solid.createSignal(0);
    setTextValue = setValue;
    const p = document.createElement('p');
    Solid.createEffect(() => {
      p.textContent = String(value());
    });
    return p;
  }, textContainer);

  const listContainer = document.createElement('div');
  let setItems!: (value: Array<{ id: number; label: string }>) => void;
  let listReversed = false;
  const disposeList = SolidWeb.render(() => {
    const [items, updateItems] = Solid.createSignal(rows);
    setItems = updateItems;
    const ul = document.createElement('ul');
    Solid.createEffect(() => {
      ul.replaceChildren(...items().map((item: { label: string }) => {
        const li = document.createElement('li');
        li.textContent = item.label;
        return li;
      }));
    });
    return ul;
  }, listContainer);

  const toggleContainer = document.createElement('div');
  let setVisible!: (value: boolean | ((value: boolean) => boolean)) => void;
  const disposeToggle = SolidWeb.render(() => {
    const [visible, updateVisible] = Solid.createSignal(true);
    setVisible = updateVisible;
    const section = document.createElement('section');
    Solid.createEffect(() => {
      const node = visible() ? document.createElement('strong') : document.createElement('em');
      node.textContent = visible() ? 'Expanded content' : 'Collapsed content';
      section.replaceChildren(node);
    });
    return section;
  }, toggleContainer);

  const fanoutRoot = Solid.createRoot((dispose: () => void) => {
    const [value, setValue] = Solid.createSignal(0);
    let runs = 0;
    for (let i = 0; i < 1_000; i++) {
      Solid.createEffect(() => {
        runs += value();
      });
    }
    return { dispose, setValue, get runs() { return runs; } };
  });

  const chainRoot = Solid.createRoot((dispose: () => void) => {
    const [source, setSource] = Solid.createSignal(0);
    let current = Solid.createMemo(() => source());
    for (let i = 0; i < 100; i++) {
      const prev = current;
      current = Solid.createMemo(() => prev() + 1);
    }
    return { dispose, setSource, current };
  });

  return [
    {
      framework: 'solid',
      category: 'dom-mount',
      name: 'mount static card 100x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const dispose = SolidWeb.render(() => createStaticCard(), container);
          dispose();
          sink += container.childNodes.length;
        }
      },
    },
    {
      framework: 'solid',
      category: 'dom-update',
      name: 'update text binding 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setTextValue((value: number) => value + 1);
        }
        sink += textContainer.textContent?.length ?? 0;
      },
      cleanup: disposeText,
    },
    {
      framework: 'solid',
      category: 'dom-update',
      name: 'reverse keyed list of 300 rows 50x',
      mode: 'realistic',
      note: 'Manual DOM mapping approximates compiled Solid output but does not use keyed reconciliation helpers.',
      fn: () => {
        for (let i = 0; i < 50; i++) {
          listReversed = !listReversed;
          setItems(listReversed ? reversed : rows);
        }
        sink += listContainer.textContent?.length ?? 0;
      },
      cleanup: disposeList,
    },
    {
      framework: 'solid',
      category: 'dom-update',
      name: 'toggle conditional branch 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setVisible((value: boolean) => !value);
        }
        sink += toggleContainer.textContent?.length ?? 0;
      },
      cleanup: disposeToggle,
    },
    {
      framework: 'solid',
      category: 'reactivity',
      name: 'notify 1k subscribers',
      mode: 'stress',
      fn: () => {
        fanoutRoot.setValue((value: number) => value + 1);
        sink += fanoutRoot.runs;
      },
      cleanup: () => fanoutRoot.dispose(),
    },
    {
      framework: 'solid',
      category: 'reactivity',
      name: 'invalidate 100 derived chain',
      mode: 'stress',
      fn: () => {
        chainRoot.setSource((value: number) => value + 1);
        sink += chainRoot.current();
      },
      cleanup: () => chainRoot.dispose(),
    },
  ];
}

async function svelteCases(): Promise<BenchCase[]> {
  const Stores = await tryImport<any>('svelte', 'svelte/store');
  if (!Stores) return [];

  const fanout = Stores.writable(0);
  let fanoutRuns = 0;
  const unsubscribers: Array<() => void> = [];
  for (let i = 0; i < 1_000; i++) {
    unsubscribers.push(fanout.subscribe((value: number) => {
      fanoutRuns += value;
    }));
  }

  const chainSource = Stores.writable(0);
  let current = Stores.derived(chainSource, ($value: number) => $value);
  for (let i = 0; i < 100; i++) {
    const prev = current;
    current = Stores.derived(prev, ($value: number) => $value + 1);
  }
  let chainValue = 0;
  const unsubscribeChain = current.subscribe((value: number) => {
    chainValue = value;
  });

  return [
    {
      framework: 'svelte',
      category: 'reactivity',
      name: 'notify 1k subscribers',
      mode: 'stress',
      note: 'Svelte coverage uses stores; component DOM benchmarks require a compiled component harness.',
      fn: () => {
        fanout.update((value: number) => value + 1);
        sink += fanoutRuns;
      },
      cleanup: () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      },
    },
    {
      framework: 'svelte',
      category: 'reactivity',
      name: 'invalidate 100 derived chain',
      mode: 'stress',
      fn: () => {
        chainSource.update((value: number) => value + 1);
        sink += chainValue;
      },
      cleanup: unsubscribeChain,
    },
  ];
}
