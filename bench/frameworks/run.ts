import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
const benchDir = dirname(fileURLToPath(import.meta.url));
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
    Option: win.Option,
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

async function compileSvelteServerComponent(name: string, source: string): Promise<any | null> {
  const compiler = await tryImport<any>('svelte', 'svelte/compiler');
  if (!compiler) return null;
  const output = compiler.compile(source, {
    generate: 'server',
    dev: false,
    filename: `${name}.svelte`,
  });
  const generatedDir = resolve(benchDir, '.generated');
  await mkdir(generatedDir, { recursive: true });
  const generatedFile = resolve(generatedDir, `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}.mjs`);
  await writeFile(generatedFile, output.js.code);
  return (await import(pathToFileURL(generatedFile).href)).default;
}

function createRows(count: number): Array<{ id: number; label: string }> {
  return Array.from({ length: count }, (_, id) => ({ id, label: `Row ${id}` }));
}

function createValueRows(count: number): Array<{ id: number; label: string; value: number }> {
  return Array.from({ length: count }, (_, id) => ({ id, label: `Row ${id}`, value: 0 }));
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

function dispatchInput(el: HTMLInputElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function dispatchChange(el: HTMLInputElement | HTMLSelectElement): void {
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function dashboardValue(seed: number): string {
  return `Revenue ${seed}`;
}

function mixedPageHtml(rows: Array<{ id: number; label: string }>, escapeText: (value: unknown) => string, escapeAttr: (value: string) => string): string {
  let out = `<main class="dashboard" data-count="${rows.length}">`;
  out += '<section><h1>Revenue</h1><p>Regional performance</p></section>';
  out += '<form><input name="q" value="north"><button disabled>Search</button></form>';
  out += '<ul>';
  for (const item of rows) {
    out += `<li data-id="${item.id}"><a href="/rows/${item.id}" title="${escapeAttr(item.label)}">${escapeText(item.label)}</a></li>`;
  }
  out += '</ul>';
  out += rows.length > 0 ? '<aside>Loaded</aside>' : '<aside>Empty</aside>';
  return out + '</main>';
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
  const fanoutUnsubscribers: Array<() => void> = [];
  for (let i = 0; i < 1_000; i++) {
    fanoutUnsubscribers.push(reactivity.subscribe(fanoutValue, (value: number) => {
      fanoutRuns += value;
    }));
  }

  const [chainSource, setChainSource] = reactivity.signal(0);
  let chainValue = reactivity.computed(() => chainSource());
  const chainScope = reactivity.createScope(() => {
    for (let i = 0; i < 100; i++) {
      const prev = chainValue;
      chainValue = reactivity.computed(() => prev() + 1);
    }
  });

  const churnBaseRows = createRows(300);
  const churnAppendRows = createRows(350);
  const [churnItems, setChurnItems] = reactivity.signal(churnBaseRows);
  const churnContainer = document.createElement('div');
  const disposeChurn = runtime.render(() => {
    const root = runtime._template('<ul></ul>').cloneNode(true) as HTMLElement;
    runtime._insert(root, () => runtime.each(churnItems, (item: { id: number; label: string }) => {
      const li = runtime._template('<li> </li>').cloneNode(true) as HTMLElement;
      li.firstChild!.textContent = item.label;
      return li;
    }, undefined, { key: (item: { id: number }) => item.id }));
    return root;
  }, churnContainer);

  const partialRows = createValueRows(1_000);
  const [partialItems, setPartialItems] = reactivity.signal(partialRows);
  const partialContainer = document.createElement('div');
  const disposePartial = runtime.render(() => {
    const root = runtime._template('<ul></ul>').cloneNode(true) as HTMLElement;
    runtime._insert(root, () => runtime.each(partialItems, (item: { id: number; label: string; value: number }) => {
      const li = runtime._template('<li><span> </span><b> </b></li>').cloneNode(true) as HTMLElement;
      li.firstChild!.textContent = item.label;
      li.lastChild!.textContent = String(item.value);
      return li;
    }, undefined, { key: (item: { id: number }) => item.id }));
    return root;
  }, partialContainer);

  const formContainer = document.createElement('div');
  const [formText, setFormText] = reactivity.signal('');
  const [formChecked, setFormChecked] = reactivity.signal(false);
  const [formChoice, setFormChoice] = reactivity.signal('a');
  const disposeForm = runtime.render(() => {
    const form = runtime._template('<form><input><input type="checkbox"><select><option value="a">A</option><option value="b">B</option></select><output> </output></form>').cloneNode(true) as HTMLFormElement;
    const text = form.firstChild as HTMLInputElement;
    const checkbox = text.nextSibling as HTMLInputElement;
    const select = checkbox.nextSibling as HTMLSelectElement;
    const output = form.lastChild as HTMLOutputElement;
    text.addEventListener('input', () => setFormText(text.value));
    checkbox.addEventListener('change', () => setFormChecked(checkbox.checked));
    select.addEventListener('change', () => setFormChoice(select.value));
    reactivity.renderEffect(() => { output.firstChild!.textContent = `${formText()}:${formChecked()}:${formChoice()}`; });
    return form;
  }, formContainer);
  const formInput = formContainer.querySelector('input') as HTMLInputElement;
  const formCheckbox = formContainer.querySelector('input[type="checkbox"]') as HTMLInputElement;
  const formSelect = formContainer.querySelector('select') as HTMLSelectElement;

  const dashboardContainer = document.createElement('div');
  const [dashboardSeed, setDashboardSeed] = reactivity.signal(0);
  const dashboardTotal = reactivity.computed(() => dashboardValue(dashboardSeed()));
  const disposeDashboard = runtime.render(() => {
    const root = runtime._template('<section><header><h2> </h2></header><main><p> </p><p> </p><p> </p></main></section>').cloneNode(true) as HTMLElement;
    const title = root.querySelector('h2')!.firstChild!;
    const cells = root.querySelectorAll('p');
    reactivity.renderEffect(() => { title.textContent = dashboardTotal(); });
    reactivity.renderEffect(() => { cells[0]!.firstChild!.textContent = String(dashboardSeed() + 1); });
    reactivity.renderEffect(() => { cells[1]!.firstChild!.textContent = String(dashboardSeed() + 2); });
    reactivity.renderEffect(() => { cells[2]!.firstChild!.textContent = String(dashboardSeed() + 3); });
    return root;
  }, dashboardContainer);

  const statefulContainer = document.createElement('div');
  const [statefulVisible, setStatefulVisible] = reactivity.signal(true);
  const [statefulValue, setStatefulValue] = reactivity.signal(0);
  let statefulCleanups = 0;
  const disposeStateful = runtime.render(() => {
    const root = runtime._template('<section></section>').cloneNode(true) as HTMLElement;
    runtime._insert(root, () => runtime.show(
      statefulVisible,
      () => {
        const node = runtime._template('<article><h3>Open</h3><p> </p></article>').cloneNode(true) as HTMLElement;
        reactivity.renderEffect(() => {
          node.lastChild!.textContent = String(statefulValue());
          return () => { statefulCleanups++; };
        });
        return node;
      },
      () => runtime._template('<aside>Closed</aside>').cloneNode(true),
    ));
    return root;
  }, statefulContainer);

  const eventContainer = document.createElement('div');
  const [eventCount, setEventCount] = reactivity.signal(0);
  const disposeEvents = runtime.render(() => {
    const root = runtime._template('<div></div>').cloneNode(true) as HTMLElement;
    for (let i = 0; i < 1_000; i++) {
      const button = runtime._template('<button>Click</button>').cloneNode(true) as HTMLButtonElement;
      button.addEventListener('click', () => setEventCount((value: number) => value + 1));
      root.appendChild(button);
    }
    return root;
  }, eventContainer);
  const eventButtons = Array.from(eventContainer.querySelectorAll('button'));
  const hydrateRows = createRows(100);
  const buildHydrateList = (): HTMLElement => {
    const root = runtime._template('<ul></ul>').cloneNode(true) as HTMLElement;
    runtime._insert(root, () => runtime.each(() => hydrateRows, (item: { id: number; label: string }) => {
      const li = runtime._template('<li> </li>').cloneNode(true) as HTMLElement;
      li.firstChild!.textContent = item.label;
      return li;
    }, undefined, { key: (item: { id: number }) => item.id, static: true }));
    return root;
  };
  const { html: mikataHydrateHtml } = await server.renderToString(buildHydrateList, { skipQueryCollection: true });

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
      category: 'lifecycle',
      name: 'mount unmount dynamic list 100x',
      mode: 'stress',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const dispose = runtime.render(buildHydrateList, container);
          dispose();
          sink += container.childNodes.length;
        }
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
      category: 'dom-list',
      name: 'append remove clear rows 20x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 20; i++) {
          setChurnItems(churnAppendRows);
          reactivity.flushSync();
          setChurnItems(churnBaseRows);
          reactivity.flushSync();
          setChurnItems([]);
          reactivity.flushSync();
          setChurnItems(churnBaseRows);
          reactivity.flushSync();
        }
        sink += churnContainer.textContent?.length ?? 0;
      },
      cleanup: disposeChurn,
    },
    {
      framework: 'mikata',
      category: 'dom-update',
      name: 'update one row in 1k rows 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          const index = i % partialRows.length;
          setPartialItems(partialRows.map((row, rowIndex) => rowIndex === index ? { ...row, value: row.value + i + 1 } : row));
          reactivity.flushSync();
        }
        sink += partialContainer.textContent?.length ?? 0;
      },
      cleanup: disposePartial,
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
      category: 'dom-update',
      name: 'toggle stateful branch 100x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          setStatefulValue((value: number) => value + 1);
          setStatefulVisible((value: boolean) => !value);
          reactivity.flushSync();
        }
        sink += statefulContainer.textContent?.length ?? 0;
        sink += statefulCleanups;
      },
      cleanup: disposeStateful,
    },
    {
      framework: 'mikata',
      category: 'forms',
      name: 'controlled form interactions 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          dispatchInput(formInput, `value-${i}`);
          formCheckbox.checked = i % 2 === 0;
          dispatchChange(formCheckbox);
          formSelect.value = i % 2 === 0 ? 'a' : 'b';
          dispatchChange(formSelect);
          reactivity.flushSync();
        }
        sink += formContainer.textContent?.length ?? 0;
      },
      cleanup: disposeForm,
    },
    {
      framework: 'mikata',
      category: 'dom-update',
      name: 'nested dashboard update 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setDashboardSeed((value: number) => value + 1);
          reactivity.flushSync();
        }
        sink += dashboardContainer.textContent?.length ?? 0;
      },
      cleanup: disposeDashboard,
    },
    {
      framework: 'mikata',
      category: 'events',
      name: 'dispatch 1k button clicks',
      mode: 'stress',
      fn: () => {
        for (const button of eventButtons) button.click();
        reactivity.flushSync();
        sink += eventCount();
      },
      cleanup: disposeEvents,
    },
    {
      framework: 'mikata',
      category: 'hydration',
      name: 'hydrate keyed list of 100 rows',
      mode: 'realistic',
      fn: () => {
        const container = document.createElement('div');
        container.innerHTML = mikataHydrateHtml;
        const dispose = runtime.hydrate(buildHydrateList, container);
        dispose();
        sink += container.textContent?.length ?? 0;
      },
    },
    {
      framework: 'mikata',
      category: 'reactivity',
      name: 'notify 1k subscribers',
      mode: 'stress',
      fn: () => {
        setFanoutValue((value: number) => value + 1);
        sink += fanoutRuns;
      },
      cleanup: () => {
        for (const unsubscribe of fanoutUnsubscribers) unsubscribe();
      },
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
      fn: () => {
        const { html } = server.renderToStaticString(() => {
          let out = '<ul>';
          for (const item of rows) {
            out += `<li>${server.escapeText(item.label)}</li>`;
          }
          return out + '</ul>';
        });
        sink += html.length;
      },
    },
    {
      framework: 'mikata',
      category: 'ssr',
      name: 'render mixed dynamic page',
      mode: 'realistic',
      fn: () => {
        const { html } = server.renderToStaticString(() => mixedPageHtml(rows, server.escapeText, server.escapeAttr));
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

  const churnBaseRows = createRows(300);
  const churnAppendRows = createRows(350);
  let setChurnItems!: (value: Array<{ id: number; label: string }>) => void;
  const churnContainer = document.createElement('div');
  const churnRoot = ReactDOMClient.createRoot(churnContainer);
  function ChurnApp(): unknown {
    const [items, updateItems] = React.useState(churnBaseRows);
    setChurnItems = updateItems;
    return h('ul', null, items.map((item) => h('li', { key: item.id }, item.label)));
  }
  ReactDOM.flushSync(() => churnRoot.render(h(ChurnApp)));

  const partialBaseRows = createValueRows(1_000);
  let partialCurrentRows = partialBaseRows;
  let setPartialItems!: (value: Array<{ id: number; label: string; value: number }>) => void;
  const partialContainer = document.createElement('div');
  const partialRoot = ReactDOMClient.createRoot(partialContainer);
  function PartialApp(): unknown {
    const [items, updateItems] = React.useState(partialBaseRows);
    setPartialItems = updateItems;
    return h('ul', null, items.map((item) => h('li', { key: item.id }, h('span', null, item.label), h('b', null, item.value))));
  }
  ReactDOM.flushSync(() => partialRoot.render(h(PartialApp)));

  let setDashboardSeed!: (value: number | ((value: number) => number)) => void;
  const dashboardContainer = document.createElement('div');
  const dashboardRoot = ReactDOMClient.createRoot(dashboardContainer);
  const DashboardContext = React.createContext(0);
  function DashboardMetric({ offset }: { offset: number }): unknown {
    const seed = React.useContext(DashboardContext);
    return h('p', null, seed + offset);
  }
  function DashboardApp(): unknown {
    const [seed, updateSeed] = React.useState(0);
    setDashboardSeed = updateSeed;
    const title = React.useMemo(() => dashboardValue(seed), [seed]);
    return h(DashboardContext.Provider, { value: seed }, h('section', null, h('header', null, h('h2', null, title)), h('main', null, h(DashboardMetric, { offset: 1 }), h(DashboardMetric, { offset: 2 }), h(DashboardMetric, { offset: 3 }))));
  }
  ReactDOM.flushSync(() => dashboardRoot.render(h(DashboardApp)));

  let setStatefulVisible!: (value: boolean | ((value: boolean) => boolean)) => void;
  let setStatefulValue!: (value: number | ((value: number) => number)) => void;
  let statefulCleanups = 0;
  const statefulContainer = document.createElement('div');
  const statefulRoot = ReactDOMClient.createRoot(statefulContainer);
  function StatefulPanel({ value }: { value: number }): unknown {
    React.useEffect(() => () => { statefulCleanups++; }, [value]);
    return h('article', null, h('h3', null, 'Open'), h('p', null, value));
  }
  function StatefulApp(): unknown {
    const [visible, updateVisible] = React.useState(true);
    const [value, updateValue] = React.useState(0);
    setStatefulVisible = updateVisible;
    setStatefulValue = updateValue;
    return h('section', null, visible ? h(StatefulPanel, { value }) : h('aside', null, 'Closed'));
  }
  ReactDOM.flushSync(() => statefulRoot.render(h(StatefulApp)));

  let eventClicks = 0;
  const eventContainer = document.createElement('div');
  const eventRoot = ReactDOMClient.createRoot(eventContainer);
  function EventsApp(): unknown {
    return h('div', null, Array.from({ length: 1_000 }, (_, index) => h('button', { key: index, onClick: () => { eventClicks++; } }, 'Click')));
  }
  ReactDOM.flushSync(() => eventRoot.render(h(EventsApp)));
  const eventButtons = Array.from(eventContainer.querySelectorAll('button'));
  const hydrateRows = createRows(100);
  function HydrateList(): unknown {
    return h('ul', null, hydrateRows.map((item) => h('li', { key: item.id }, item.label)));
  }
  const reactHydrateHtml = ReactDOMServer.renderToString(h(HydrateList));

  let formStateSink = '';
  const formContainer = document.createElement('div');
  const formRoot = ReactDOMClient.createRoot(formContainer);
  function FormApp(): unknown {
    const [text, setText] = React.useState('');
    const [checked, setChecked] = React.useState(false);
    const [choice, setChoice] = React.useState('a');
    formStateSink = `${text}:${checked}:${choice}`;
    return h('form', null,
      h('input', { value: text, onInput: (event: any) => setText(event.currentTarget.value) }),
      h('input', { type: 'checkbox', checked, onChange: (event: any) => setChecked(event.currentTarget.checked) }),
      h('select', { value: choice, onChange: (event: any) => setChoice(event.currentTarget.value) }, h('option', { value: 'a' }, 'A'), h('option', { value: 'b' }, 'B')),
      h('output', null, formStateSink),
    );
  }
  ReactDOM.flushSync(() => formRoot.render(h(FormApp)));
  const formInput = formContainer.querySelector('input') as HTMLInputElement;
  const formCheckbox = formContainer.querySelector('input[type="checkbox"]') as HTMLInputElement;
  const formSelect = formContainer.querySelector('select') as HTMLSelectElement;

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
      category: 'lifecycle',
      name: 'mount unmount dynamic list 100x',
      mode: 'stress',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const root = ReactDOMClient.createRoot(container);
          ReactDOM.flushSync(() => root.render(h(HydrateList)));
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
      category: 'dom-list',
      name: 'append remove clear rows 20x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 20; i++) {
          ReactDOM.flushSync(() => setChurnItems(churnAppendRows));
          ReactDOM.flushSync(() => setChurnItems(churnBaseRows));
          ReactDOM.flushSync(() => setChurnItems([]));
          ReactDOM.flushSync(() => setChurnItems(churnBaseRows));
        }
        sink += churnContainer.textContent?.length ?? 0;
      },
      cleanup: () => churnRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'dom-update',
      name: 'update one row in 1k rows 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          const index = i % partialCurrentRows.length;
          partialCurrentRows = partialCurrentRows.map((row, rowIndex) => rowIndex === index ? { ...row, value: row.value + i + 1 } : row);
          ReactDOM.flushSync(() => setPartialItems(partialCurrentRows));
        }
        sink += partialContainer.textContent?.length ?? 0;
      },
      cleanup: () => partialRoot.unmount(),
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
      category: 'dom-update',
      name: 'toggle stateful branch 100x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          ReactDOM.flushSync(() => {
            setStatefulValue((value) => value + 1);
            setStatefulVisible((value) => !value);
          });
        }
        sink += statefulContainer.textContent?.length ?? 0;
        sink += statefulCleanups;
      },
      cleanup: () => statefulRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'forms',
      name: 'controlled form interactions 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          ReactDOM.flushSync(() => dispatchInput(formInput, `value-${i}`));
          formCheckbox.checked = i % 2 === 0;
          ReactDOM.flushSync(() => dispatchChange(formCheckbox));
          formSelect.value = i % 2 === 0 ? 'a' : 'b';
          ReactDOM.flushSync(() => dispatchChange(formSelect));
        }
        sink += formContainer.textContent?.length ?? 0;
      },
      cleanup: () => formRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'dom-update',
      name: 'nested dashboard update 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          ReactDOM.flushSync(() => setDashboardSeed((value) => value + 1));
        }
        sink += dashboardContainer.textContent?.length ?? 0;
      },
      cleanup: () => dashboardRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'events',
      name: 'dispatch 1k button clicks',
      mode: 'stress',
      fn: () => {
        for (const button of eventButtons) button.click();
        sink += eventClicks;
      },
      cleanup: () => eventRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'hydration',
      name: 'hydrate keyed list of 100 rows',
      mode: 'realistic',
      fn: async () => {
        const container = document.createElement('div');
        container.innerHTML = reactHydrateHtml;
        document.body.appendChild(container);
        const root = ReactDOMClient.hydrateRoot(container, h(HydrateList), {
          onRecoverableError: () => {},
        });
        await new Promise((resolve) => setTimeout(resolve, 5));
        root.unmount();
        container.remove();
        sink += container.textContent?.length ?? 0;
      },
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
    {
      framework: 'react',
      category: 'ssr',
      name: 'render mixed dynamic page',
      mode: 'realistic',
      fn: () => {
        const html = ReactDOMServer.renderToString(h('main', { className: 'dashboard', 'data-count': rows.length },
          h('section', null, h('h1', null, 'Revenue'), h('p', null, 'Regional performance')),
          h('form', null, h('input', { name: 'q', defaultValue: 'north' }), h('button', { disabled: true }, 'Search')),
          h('ul', null, rows.map((item) => h('li', { key: item.id, 'data-id': item.id }, h('a', { href: `/rows/${item.id}`, title: item.label }, item.label)))),
          rows.length > 0 ? h('aside', null, 'Loaded') : h('aside', null, 'Empty'),
        ));
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

  const churnBaseRows = createRows(300);
  const churnAppendRows = createRows(350);
  const churnItems = Vue.ref(churnBaseRows);
  const churnContainer = document.createElement('div');
  const churnApp = Vue.createApp({
    setup: () => () => Vue.h('ul', churnItems.value.map((item: { id: number; label: string }) => Vue.h('li', { key: item.id }, item.label))),
  });
  churnApp.mount(churnContainer);

  const partialBaseRows = createValueRows(1_000);
  let partialCurrentRows = partialBaseRows;
  const partialItems = Vue.ref(partialBaseRows);
  const partialContainer = document.createElement('div');
  const partialApp = Vue.createApp({
    setup: () => () => Vue.h('ul', partialItems.value.map((item: { id: number; label: string; value: number }) => Vue.h('li', { key: item.id }, [Vue.h('span', item.label), Vue.h('b', String(item.value))]))),
  });
  partialApp.mount(partialContainer);

  const formText = Vue.ref('');
  const formChecked = Vue.ref(false);
  const formChoice = Vue.ref('a');
  const formContainer = document.createElement('div');
  const formApp = Vue.createApp({
    setup: () => () => Vue.h('form', [
      Vue.h('input', { value: formText.value, onInput: (event: Event) => { formText.value = (event.currentTarget as HTMLInputElement).value; } }),
      Vue.h('input', { type: 'checkbox', checked: formChecked.value, onChange: (event: Event) => { formChecked.value = (event.currentTarget as HTMLInputElement).checked; } }),
      Vue.h('select', { value: formChoice.value, onChange: (event: Event) => { formChoice.value = (event.currentTarget as HTMLSelectElement).value; } }, [Vue.h('option', { value: 'a' }, 'A'), Vue.h('option', { value: 'b' }, 'B')]),
      Vue.h('output', `${formText.value}:${formChecked.value}:${formChoice.value}`),
    ]),
  });
  formApp.mount(formContainer);
  const formInput = formContainer.querySelector('input') as HTMLInputElement;
  const formCheckbox = formContainer.querySelector('input[type="checkbox"]') as HTMLInputElement;
  const formSelect = formContainer.querySelector('select') as HTMLSelectElement;

  const DashboardKey = Symbol('dashboard');
  const dashboardSeed = Vue.ref(0);
  const dashboardContainer = document.createElement('div');
  const DashboardMetric = {
    props: ['offset'],
    setup(props: { offset: number }) {
      const seed = Vue.inject(DashboardKey) as { value: number };
      return () => Vue.h('p', String(seed.value + props.offset));
    },
  };
  const dashboardApp = Vue.createApp({
    setup() {
      Vue.provide(DashboardKey, dashboardSeed);
      const title = Vue.computed(() => dashboardValue(dashboardSeed.value));
      return () => Vue.h('section', [Vue.h('header', [Vue.h('h2', title.value)]), Vue.h('main', [Vue.h(DashboardMetric, { offset: 1 }), Vue.h(DashboardMetric, { offset: 2 }), Vue.h(DashboardMetric, { offset: 3 })])]);
    },
  });
  dashboardApp.mount(dashboardContainer);

  const statefulVisible = Vue.ref(true);
  const statefulValue = Vue.ref(0);
  let statefulCleanups = 0;
  const StatefulPanel = {
    props: ['value'],
    setup(props: { value: number }) {
      Vue.onUnmounted(() => { statefulCleanups++; });
      return () => Vue.h('article', [Vue.h('h3', 'Open'), Vue.h('p', String(props.value))]);
    },
  };
  const statefulContainer = document.createElement('div');
  const statefulApp = Vue.createApp({
    setup: () => () => Vue.h('section', statefulVisible.value ? Vue.h(StatefulPanel, { value: statefulValue.value }) : Vue.h('aside', 'Closed')),
  });
  statefulApp.mount(statefulContainer);

  let eventClicks = 0;
  const eventContainer = document.createElement('div');
  const eventApp = Vue.createApp({
    setup: () => () => Vue.h('div', Array.from({ length: 1_000 }, (_, index) => Vue.h('button', { key: index, onClick: () => { eventClicks++; } }, 'Click'))),
  });
  eventApp.mount(eventContainer);
  const eventButtons = Array.from(eventContainer.querySelectorAll('button'));
  const hydrateRows = createRows(100);
  const HydrateList = {
    render: () => Vue.h('ul', hydrateRows.map((item: { id: number; label: string }) => Vue.h('li', { key: item.id }, item.label))),
  };
  const vueHydrateHtml = VueServer ? await VueServer.renderToString(Vue.createSSRApp(HydrateList)) : '';

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
      category: 'lifecycle',
      name: 'mount unmount dynamic list 100x',
      mode: 'stress',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const app = Vue.createApp(HydrateList);
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
      category: 'dom-list',
      name: 'append remove clear rows 20x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 20; i++) {
          churnItems.value = churnAppendRows;
          await Vue.nextTick();
          churnItems.value = churnBaseRows;
          await Vue.nextTick();
          churnItems.value = [];
          await Vue.nextTick();
          churnItems.value = churnBaseRows;
          await Vue.nextTick();
        }
        sink += churnContainer.textContent?.length ?? 0;
      },
      cleanup: () => churnApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'dom-update',
      name: 'update one row in 1k rows 250x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 250; i++) {
          const index = i % partialCurrentRows.length;
          partialCurrentRows = partialCurrentRows.map((row, rowIndex) => rowIndex === index ? { ...row, value: row.value + i + 1 } : row);
          partialItems.value = partialCurrentRows;
          await Vue.nextTick();
        }
        sink += partialContainer.textContent?.length ?? 0;
      },
      cleanup: () => partialApp.unmount(),
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
      category: 'dom-update',
      name: 'toggle stateful branch 100x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 100; i++) {
          statefulValue.value += 1;
          statefulVisible.value = !statefulVisible.value;
          await Vue.nextTick();
        }
        sink += statefulContainer.textContent?.length ?? 0;
        sink += statefulCleanups;
      },
      cleanup: () => statefulApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'forms',
      name: 'controlled form interactions 250x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 250; i++) {
          dispatchInput(formInput, `value-${i}`);
          formCheckbox.checked = i % 2 === 0;
          dispatchChange(formCheckbox);
          formSelect.value = i % 2 === 0 ? 'a' : 'b';
          dispatchChange(formSelect);
          await Vue.nextTick();
        }
        sink += formContainer.textContent?.length ?? 0;
      },
      cleanup: () => formApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'dom-update',
      name: 'nested dashboard update 250x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 250; i++) {
          dashboardSeed.value += 1;
          await Vue.nextTick();
        }
        sink += dashboardContainer.textContent?.length ?? 0;
      },
      cleanup: () => dashboardApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'events',
      name: 'dispatch 1k button clicks',
      mode: 'stress',
      fn: () => {
        for (const button of eventButtons) button.click();
        sink += eventClicks;
      },
      cleanup: () => eventApp.unmount(),
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
      category: 'hydration',
      name: 'hydrate keyed list of 100 rows',
      mode: 'realistic',
      fn: () => {
        const container = document.createElement('div');
        container.innerHTML = vueHydrateHtml;
        const app = Vue.createSSRApp(HydrateList);
        app.mount(container);
        app.unmount();
        sink += container.textContent?.length ?? 0;
      },
    });
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
    cases.push({
      framework: 'vue',
      category: 'ssr',
      name: 'render mixed dynamic page',
      mode: 'realistic',
      fn: async () => {
        const app = Vue.createSSRApp({
          render: () => Vue.h('main', { class: 'dashboard', 'data-count': rows.length }, [
            Vue.h('section', [Vue.h('h1', 'Revenue'), Vue.h('p', 'Regional performance')]),
            Vue.h('form', [Vue.h('input', { name: 'q', value: 'north' }), Vue.h('button', { disabled: true }, 'Search')]),
            Vue.h('ul', rows.map((item) => Vue.h('li', { key: item.id, 'data-id': item.id }, [Vue.h('a', { href: `/rows/${item.id}`, title: item.label }, item.label)]))),
            rows.length > 0 ? Vue.h('aside', 'Loaded') : Vue.h('aside', 'Empty'),
          ]),
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
  const SolidServer = await tryImport<any>('solid', './node_modules/solid-js/web/dist/server.js', false);
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

  const churnBaseRows = createRows(300);
  const churnAppendRows = createRows(350);
  const churnContainer = document.createElement('div');
  let setChurnItems!: (value: Array<{ id: number; label: string }>) => void;
  const disposeChurn = SolidWeb.render(() => {
    const [items, updateItems] = Solid.createSignal(churnBaseRows);
    setChurnItems = updateItems;
    const ul = document.createElement('ul');
    Solid.createEffect(() => {
      ul.replaceChildren(...items().map((item: { label: string }) => {
        const li = document.createElement('li');
        li.textContent = item.label;
        return li;
      }));
    });
    return ul;
  }, churnContainer);

  const partialBaseRows = createValueRows(1_000);
  let partialCurrentRows = partialBaseRows;
  const partialContainer = document.createElement('div');
  let setPartialItems!: (value: Array<{ id: number; label: string; value: number }>) => void;
  const disposePartial = SolidWeb.render(() => {
    const [items, updateItems] = Solid.createSignal(partialBaseRows);
    setPartialItems = updateItems;
    const ul = document.createElement('ul');
    Solid.createEffect(() => {
      ul.replaceChildren(...items().map((item: { label: string; value: number }) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        const b = document.createElement('b');
        span.textContent = item.label;
        b.textContent = String(item.value);
        li.append(span, b);
        return li;
      }));
    });
    return ul;
  }, partialContainer);

  const formContainer = document.createElement('div');
  let formInput!: HTMLInputElement;
  let formCheckbox!: HTMLInputElement;
  let formSelect!: HTMLSelectElement;
  const disposeForm = SolidWeb.render(() => {
    const [text, setText] = Solid.createSignal('');
    const [checked, setChecked] = Solid.createSignal(false);
    const [choice, setChoice] = Solid.createSignal('a');
    const form = document.createElement('form');
    formInput = document.createElement('input');
    formCheckbox = document.createElement('input');
    formCheckbox.type = 'checkbox';
    formSelect = document.createElement('select');
    formSelect.append(new Option('A', 'a'), new Option('B', 'b'));
    const output = document.createElement('output');
    formInput.addEventListener('input', () => setText(formInput.value));
    formCheckbox.addEventListener('change', () => setChecked(formCheckbox.checked));
    formSelect.addEventListener('change', () => setChoice(formSelect.value));
    Solid.createEffect(() => {
      output.textContent = `${text()}:${checked()}:${choice()}`;
    });
    form.append(formInput, formCheckbox, formSelect, output);
    return form;
  }, formContainer);

  const dashboardContainer = document.createElement('div');
  let setDashboardSeed!: (value: number | ((value: number) => number)) => void;
  const DashboardContext = Solid.createContext<() => number>();
  function DashboardMetric(props: { offset: number }): HTMLParagraphElement {
    const seed = Solid.useContext(DashboardContext)!;
    const p = document.createElement('p');
    Solid.createEffect(() => {
      p.textContent = String(seed() + props.offset);
    });
    return p;
  }
  const disposeDashboard = SolidWeb.render(() => {
    const [seed, updateSeed] = Solid.createSignal(0);
    setDashboardSeed = updateSeed;
    const root = document.createElement('section');
    const header = document.createElement('header');
    const title = document.createElement('h2');
    const main = document.createElement('main');
    const total = Solid.createMemo(() => dashboardValue(seed()));
    Solid.createEffect(() => {
      title.textContent = total();
    });
    header.appendChild(title);
    root.append(header, main);
    return Solid.createComponent(DashboardContext.Provider, {
      value: seed,
      get children() {
        main.replaceChildren(DashboardMetric({ offset: 1 }), DashboardMetric({ offset: 2 }), DashboardMetric({ offset: 3 }));
        return root;
      },
    });
  }, dashboardContainer);

  const statefulContainer = document.createElement('div');
  let setStatefulVisible!: (value: boolean | ((value: boolean) => boolean)) => void;
  let setStatefulValue!: (value: number | ((value: number) => number)) => void;
  let statefulCleanups = 0;
  const disposeStateful = SolidWeb.render(() => {
    const [visible, updateVisible] = Solid.createSignal(true);
    const [value, updateValue] = Solid.createSignal(0);
    setStatefulVisible = updateVisible;
    setStatefulValue = updateValue;
    const section = document.createElement('section');
    Solid.createEffect(() => {
      if (visible()) {
        const article = document.createElement('article');
        const h3 = document.createElement('h3');
        const p = document.createElement('p');
        h3.textContent = 'Open';
        p.textContent = String(value());
        article.append(h3, p);
        Solid.onCleanup(() => { statefulCleanups++; });
        section.replaceChildren(article);
      } else {
        const aside = document.createElement('aside');
        aside.textContent = 'Closed';
        section.replaceChildren(aside);
      }
    });
    return section;
  }, statefulContainer);

  let eventClicks = 0;
  const eventContainer = document.createElement('div');
  const disposeEvents = SolidWeb.render(() => {
    const root = document.createElement('div');
    for (let i = 0; i < 1_000; i++) {
      const button = document.createElement('button');
      button.textContent = 'Click';
      button.addEventListener('click', () => { eventClicks++; });
      root.appendChild(button);
    }
    return root;
  }, eventContainer);
  const eventButtons = Array.from(eventContainer.querySelectorAll('button'));
  const lifecycleRows = createRows(100);

  const cases: BenchCase[] = [
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
      category: 'lifecycle',
      name: 'mount unmount dynamic list 100x',
      mode: 'stress',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const dispose = SolidWeb.render(() => {
            const ul = document.createElement('ul');
            ul.append(...lifecycleRows.map((item) => {
              const li = document.createElement('li');
              li.textContent = item.label;
              return li;
            }));
            return ul;
          }, container);
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
      category: 'dom-list',
      name: 'append remove clear rows 20x',
      mode: 'realistic',
      note: 'Manual DOM mapping approximates compiled Solid output but does not use keyed reconciliation helpers.',
      fn: () => {
        for (let i = 0; i < 20; i++) {
          setChurnItems(churnAppendRows);
          setChurnItems(churnBaseRows);
          setChurnItems([]);
          setChurnItems(churnBaseRows);
        }
        sink += churnContainer.textContent?.length ?? 0;
      },
      cleanup: disposeChurn,
    },
    {
      framework: 'solid',
      category: 'dom-update',
      name: 'update one row in 1k rows 250x',
      mode: 'realistic',
      note: 'Manual DOM mapping approximates compiled Solid output but does not use keyed reconciliation helpers.',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          const index = i % partialCurrentRows.length;
          partialCurrentRows = partialCurrentRows.map((row, rowIndex) => rowIndex === index ? { ...row, value: row.value + i + 1 } : row);
          setPartialItems(partialCurrentRows);
        }
        sink += partialContainer.textContent?.length ?? 0;
      },
      cleanup: disposePartial,
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
      category: 'dom-update',
      name: 'toggle stateful branch 100x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          setStatefulValue((value: number) => value + 1);
          setStatefulVisible((value: boolean) => !value);
        }
        sink += statefulContainer.textContent?.length ?? 0;
        sink += statefulCleanups;
      },
      cleanup: disposeStateful,
    },
    {
      framework: 'solid',
      category: 'forms',
      name: 'controlled form interactions 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          dispatchInput(formInput, `value-${i}`);
          formCheckbox.checked = i % 2 === 0;
          dispatchChange(formCheckbox);
          formSelect.value = i % 2 === 0 ? 'a' : 'b';
          dispatchChange(formSelect);
        }
        sink += formContainer.textContent?.length ?? 0;
      },
      cleanup: disposeForm,
    },
    {
      framework: 'solid',
      category: 'dom-update',
      name: 'nested dashboard update 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setDashboardSeed((value: number) => value + 1);
        }
        sink += dashboardContainer.textContent?.length ?? 0;
      },
      cleanup: disposeDashboard,
    },
    {
      framework: 'solid',
      category: 'events',
      name: 'dispatch 1k button clicks',
      mode: 'stress',
      fn: () => {
        for (const button of eventButtons) button.click();
        sink += eventClicks;
      },
      cleanup: disposeEvents,
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

  if (SolidServer) {
    cases.push({
      framework: 'solid',
      category: 'ssr',
      name: 'render keyed list of 300 rows',
      mode: 'realistic',
      fn: () => {
        const html = SolidServer.renderToString(() => SolidServer.ssr(
          ['<ul>', '</ul>'],
          rows.map((item) => SolidServer.ssr(['<li>', '</li>'], SolidServer.escape(item.label))),
        ));
        sink += html.length;
      },
    });
    cases.push({
      framework: 'solid',
      category: 'ssr',
      name: 'render mixed dynamic page',
      mode: 'realistic',
      fn: () => {
        const html = SolidServer.renderToString(() => SolidServer.ssr(
          [`<main class="dashboard" data-count="${rows.length}"><section><h1>Revenue</h1><p>Regional performance</p></section><form><input name="q" value="north"><button disabled>Search</button></form><ul>`, '</ul><aside>Loaded</aside></main>'],
          rows.map((item) => SolidServer.ssr(
            [`<li data-id="${item.id}"><a href="/rows/${item.id}" title="${item.label}">`, '</a></li>'],
            SolidServer.escape(item.label),
          )),
        ));
        sink += html.length;
      },
    });
  }

  return cases;
}

async function svelteCases(): Promise<BenchCase[]> {
  const Stores = await tryImport<any>('svelte', 'svelte/store');
  if (!Stores) return [];
  const SvelteServer = await tryImport<any>('svelte', 'svelte/server', false);
  const rows = createRows(300);

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

  const cases: BenchCase[] = [
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

  if (SvelteServer) {
    const KeyedList = await compileSvelteServerComponent(
      'KeyedList',
      '<script>let { rows = [] } = $props();</script><ul>{#each rows as row (row.id)}<li>{row.label}</li>{/each}</ul>',
    );
    const MixedPage = await compileSvelteServerComponent(
      'MixedPage',
      '<script>let { rows = [] } = $props();</script><main class="dashboard" data-count={rows.length}><section><h1>Revenue</h1><p>Regional performance</p></section><form><input name="q" value="north"><button disabled>Search</button></form><ul>{#each rows as row (row.id)}<li data-id={row.id}><a href={`/rows/${row.id}`} title={row.label}>{row.label}</a></li>{/each}</ul>{#if rows.length > 0}<aside>Loaded</aside>{:else}<aside>Empty</aside>{/if}</main>',
    );
    if (KeyedList) {
      cases.push({
        framework: 'svelte',
        category: 'ssr',
        name: 'render keyed list of 300 rows',
        mode: 'realistic',
        fn: () => {
          const { body } = SvelteServer.render(KeyedList, { props: { rows } });
          sink += body.length;
        },
      });
    }
    if (MixedPage) {
      cases.push({
        framework: 'svelte',
        category: 'ssr',
        name: 'render mixed dynamic page',
        mode: 'realistic',
        fn: () => {
          const { body } = SvelteServer.render(MixedPage, { props: { rows } });
          sink += body.length;
        },
      });
    }
  }

  return cases;
}
