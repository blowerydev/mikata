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

function fullPageHtml(rows: Array<{ id: number; label: string }>, escapeText: (value: unknown) => string, escapeAttr: (value: string) => string): string {
  let out = '<main class="app-shell" data-route="reports">';
  out += '<header><h1>Ops dashboard</h1><nav><a class="active" href="/reports">Reports</a><a href="/settings">Settings</a></nav></header>';
  out += '<section class="summary"><h2>Revenue</h2><p>Regional performance</p><output>ready</output></section>';
  out += '<form><label>Search<input name="q" value="north"></label><button disabled>Search</button></form>';
  out += '<table><tbody>';
  for (const item of rows.slice(0, 80)) {
    out += `<tr data-id="${item.id}"><td>${escapeText(item.label)}</td><td><a href="/rows/${item.id}" title="${escapeAttr(item.label)}">Open</a></td></tr>`;
  }
  out += '</tbody></table><aside>Loaded</aside></main>';
  return out;
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
  const fullPageRows = createRows(160);
  const buildFullPage = (): HTMLElement => {
    const root = document.createElement('main');
    root.className = 'app-shell';
    const header = document.createElement('header');
    const h1 = document.createElement('h1');
    const nav = document.createElement('nav');
    const reports = document.createElement('a');
    const settings = document.createElement('a');
    const summary = document.createElement('section');
    const h2 = document.createElement('h2');
    const p = document.createElement('p');
    const output = document.createElement('output');
    const form = document.createElement('form');
    const label = document.createElement('label');
    const input = document.createElement('input');
    const button = document.createElement('button');
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    const aside = document.createElement('aside');
    h1.textContent = 'Ops dashboard';
    reports.className = 'active';
    reports.href = '/reports';
    reports.textContent = 'Reports';
    settings.href = '/settings';
    settings.textContent = 'Settings';
    nav.appendChild(reports);
    nav.appendChild(settings);
    header.appendChild(h1);
    header.appendChild(nav);
    summary.className = 'summary';
    h2.textContent = 'Revenue';
    p.textContent = 'Regional performance';
    output.textContent = 'ready';
    summary.appendChild(h2);
    summary.appendChild(p);
    summary.appendChild(output);
    label.textContent = 'Search';
    input.name = 'q';
    input.value = 'north';
    button.disabled = true;
    button.textContent = 'Search';
    label.appendChild(input);
    form.appendChild(label);
    form.appendChild(button);
    for (const item of fullPageRows.slice(0, 80)) {
      const tr = document.createElement('tr');
      const labelCell = document.createElement('td');
      const actionCell = document.createElement('td');
      const link = document.createElement('a');
      tr.dataset.id = String(item.id);
      labelCell.textContent = item.label;
      link.href = `/rows/${item.id}`;
      link.title = item.label;
      link.textContent = 'Open';
      actionCell.appendChild(link);
      tr.appendChild(labelCell);
      tr.appendChild(actionCell);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    aside.textContent = 'Loaded';
    root.appendChild(header);
    root.appendChild(summary);
    root.appendChild(form);
    root.appendChild(table);
    root.appendChild(aside);
    return root;
  };
  const { html: mikataFullPageHtml } = await server.renderToString(buildFullPage, { skipQueryCollection: true });

  const [route, setRoute] = reactivity.signal<'overview' | 'reports' | 'settings'>('overview');
  const routeContainer = document.createElement('div');
  const disposeRoute = runtime.render(() => {
    const root = runtime._template('<section><nav><button>Overview</button><button>Reports</button><button>Settings</button></nav><main><h2> </h2><p> </p></main></section>').cloneNode(true) as HTMLElement;
    const buttons = root.querySelectorAll('button');
    buttons[0]!.addEventListener('click', () => setRoute('overview'));
    buttons[1]!.addEventListener('click', () => setRoute('reports'));
    buttons[2]!.addEventListener('click', () => setRoute('settings'));
    const title = root.querySelector('h2')!.firstChild!;
    const body = root.querySelector('p')!.firstChild!;
    reactivity.renderEffect(() => {
      const current = route();
      title.textContent = current;
      body.textContent = current === 'reports' ? 'Nested report outlet' : current === 'settings' ? 'Nested settings outlet' : 'Nested overview outlet';
      buttons.forEach((button, index) => {
        button.toggleAttribute('aria-current', index === (current === 'overview' ? 0 : current === 'reports' ? 1 : 2));
      });
    });
    return root;
  }, routeContainer);

  const [asyncStatus, setAsyncStatus] = reactivity.signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [asyncData, setAsyncData] = reactivity.signal('none');
  const asyncContainer = document.createElement('div');
  const disposeAsync = runtime.render(() => {
    const root = runtime._template('<section><h2> </h2><p> </p><button>Retry</button></section>').cloneNode(true) as HTMLElement;
    const title = root.querySelector('h2')!.firstChild!;
    const body = root.querySelector('p')!.firstChild!;
    reactivity.renderEffect(() => {
      title.textContent = asyncStatus();
      body.textContent = asyncStatus() === 'success' ? asyncData() : asyncStatus() === 'error' ? 'failed' : 'waiting';
    });
    return root;
  }, asyncContainer);

  const largeFormValues = Array.from({ length: 75 }, () => '');
  const [largeFormVersion, setLargeFormVersion] = reactivity.signal(0);
  const largeFormContainer = document.createElement('div');
  const disposeLargeForm = runtime.render(() => {
    const form = runtime._template('<form><fieldset></fieldset><output> </output></form>').cloneNode(true) as HTMLFormElement;
    const fieldset = form.firstChild as HTMLFieldSetElement;
    const output = form.lastChild as HTMLOutputElement;
    for (let i = 0; i < largeFormValues.length; i++) {
      const input = runtime._template('<input>').cloneNode(true) as HTMLInputElement;
      input.name = `field-${i}`;
      input.addEventListener('input', () => {
        largeFormValues[i] = input.value;
        setLargeFormVersion((value: number) => value + 1);
      });
      fieldset.appendChild(input);
    }
    reactivity.renderEffect(() => {
      largeFormVersion();
      output.firstChild!.textContent = String(largeFormValues.filter(Boolean).length);
    });
    return form;
  }, largeFormContainer);
  const largeFormInputs = Array.from(largeFormContainer.querySelectorAll('input'));

  const tableBaseRows = createValueRows(500);
  let tableCurrentRows = tableBaseRows;
  const [tableRows, setTableRows] = reactivity.signal(tableBaseRows);
  const [tableFilter, setTableFilter] = reactivity.signal('');
  const [tableSortAsc, setTableSortAsc] = reactivity.signal(true);
  const [tablePage, setTablePage] = reactivity.signal(0);
  const [tableSelectedId, setTableSelectedId] = reactivity.signal<number | null>(null);
  const tableIsSelected = reactivity.createSelector(tableSelectedId);
  const tableVisibleRows = reactivity.computed(() => {
    const needle = tableFilter();
    const sorted = [...tableRows()].filter((row: { label: string }) => row.label.includes(needle));
    sorted.sort((a, b) => tableSortAsc() ? a.id - b.id : b.id - a.id);
    return sorted.slice(tablePage() * 25, tablePage() * 25 + 25);
  });
  const tableContainer = document.createElement('div');
  const disposeTable = runtime.render(() => {
    const table = runtime._template('<table><tbody></tbody></table>').cloneNode(true) as HTMLTableElement;
    const tbody = table.firstChild as HTMLTableSectionElement;
    runtime._insert(tbody, () => runtime.each(tableVisibleRows, (item: { id: number; label: string; value: number }) => {
      const tr = runtime._template('<tr><td> </td><td> </td><td> </td></tr>').cloneNode(true) as HTMLTableRowElement;
      tr.addEventListener('click', () => setTableSelectedId(item.id));
      reactivity.renderEffect(() => {
        tr.toggleAttribute('aria-selected', tableIsSelected(item.id));
      });
      tr.childNodes[0]!.textContent = item.label;
      tr.childNodes[1]!.textContent = String(item.value);
      tr.childNodes[2]!.textContent = String(item.id);
      return tr;
    }, undefined, { key: (item: { id: number }) => item.id }));
    return table;
  }, tableContainer);

  const [overlayOpen, setOverlayOpen] = reactivity.signal(false);
  let overlayCleanups = 0;
  const overlayContainer = document.createElement('div');
  const disposeOverlay = runtime.render(() => {
    const root = runtime._template('<section></section>').cloneNode(true) as HTMLElement;
    runtime._insert(root, () => runtime.show(overlayOpen, () => {
      const dialog = runtime._template('<dialog open><button>Close</button></dialog>').cloneNode(true) as HTMLDialogElement;
      const onKey = () => {};
      document.addEventListener('keydown', onKey);
      reactivity.onCleanup(() => {
        document.removeEventListener('keydown', onKey);
        overlayCleanups++;
      });
      return dialog;
    }, () => runtime._template('<span>Closed</span>').cloneNode(true)));
    return root;
  }, overlayContainer);

  const ContextSeed = runtime.createContext();
  const [contextSeed, setContextSeed] = reactivity.signal(0);
  const contextContainer = document.createElement('div');
  const disposeContext = runtime.render(() => {
    runtime.provide(ContextSeed, contextSeed);
    const root = runtime._template('<section></section>').cloneNode(true) as HTMLElement;
    for (let i = 0; i < 50; i++) {
      const seed = runtime.inject(ContextSeed) as () => number;
      const p = runtime._template('<p> </p>').cloneNode(true) as HTMLParagraphElement;
      reactivity.renderEffect(() => {
        p.firstChild!.textContent = String(seed() + i);
      });
      root.appendChild(p);
    }
    return root;
  }, contextContainer);

  let leakCleanups = 0;
  const schedulerSignals = Array.from({ length: 20 }, () => reactivity.signal(0) as [() => number, (value: number | ((value: number) => number)) => void]);
  const schedulerContainer = document.createElement('div');
  const disposeScheduler = runtime.render(() => {
    const root = runtime._template('<section><output> </output></section>').cloneNode(true) as HTMLElement;
    const output = root.querySelector('output')!.firstChild!;
    reactivity.renderEffect(() => {
      output.textContent = String(schedulerSignals.reduce((total, [read]) => total + read(), 0));
    });
    return root;
  }, schedulerContainer);

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
      category: 'routing',
      name: 'navigate nested app shell 200x',
      mode: 'realistic',
      fn: () => {
        const next = ['overview', 'reports', 'settings'] as const;
        for (let i = 0; i < 200; i++) {
          setRoute(next[i % next.length]);
          reactivity.flushSync();
        }
        sink += routeContainer.textContent?.length ?? 0;
      },
      cleanup: disposeRoute,
    },
    {
      framework: 'mikata',
      category: 'async',
      name: 'query lifecycle refetch recovery 100x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          setAsyncStatus('loading');
          reactivity.flushSync();
          setAsyncData(`row-${i}`);
          setAsyncStatus('success');
          reactivity.flushSync();
          setAsyncStatus('error');
          reactivity.flushSync();
          setAsyncStatus('loading');
          setAsyncData(`retry-${i}`);
          setAsyncStatus('success');
          reactivity.flushSync();
        }
        sink += asyncContainer.textContent?.length ?? 0;
      },
      cleanup: disposeAsync,
    },
    {
      framework: 'mikata',
      category: 'forms',
      name: 'large validated form flow 20x',
      mode: 'realistic',
      fn: () => {
        for (let round = 0; round < 20; round++) {
          for (let i = 0; i < largeFormInputs.length; i++) {
            dispatchInput(largeFormInputs[i]!, `v-${round}-${i}`);
          }
          reactivity.flushSync();
          for (let i = 0; i < largeFormInputs.length; i += 3) {
            dispatchInput(largeFormInputs[i]!, '');
          }
          reactivity.flushSync();
        }
        sink += largeFormContainer.textContent?.length ?? 0;
      },
      cleanup: disposeLargeForm,
    },
    {
      framework: 'mikata',
      category: 'table',
      name: 'sort filter paginate edit select 50x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 50; i++) {
          tableCurrentRows = tableCurrentRows.map((row, index) => index === i ? { ...row, value: row.value + i + 1 } : row);
          setTableRows(tableCurrentRows);
          setTableFilter(i % 3 === 0 ? '1' : '');
          setTableSortAsc((value: boolean) => !value);
          setTablePage(i % 4);
          setTableSelectedId(i);
          reactivity.flushSync();
        }
        sink += tableContainer.textContent?.length ?? 0;
      },
      cleanup: disposeTable,
    },
    {
      framework: 'mikata',
      category: 'lifecycle',
      name: 'modal listener cleanup 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setOverlayOpen((value: boolean) => !value);
          reactivity.flushSync();
        }
        sink += overlayContainer.textContent?.length ?? 0;
        sink += overlayCleanups;
      },
      cleanup: disposeOverlay,
    },
    {
      framework: 'mikata',
      category: 'context',
      name: 'deep provider consumers update 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setContextSeed((value: number) => value + 1);
          reactivity.flushSync();
        }
        sink += contextContainer.textContent?.length ?? 0;
      },
      cleanup: disposeContext,
    },
    {
      framework: 'mikata',
      category: 'hydration',
      name: 'hydrate full app page 50x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 50; i++) {
          const container = document.createElement('div');
          container.innerHTML = mikataFullPageHtml;
          const dispose = runtime.hydrate(buildFullPage, container);
          dispose();
          sink += container.textContent?.length ?? 0;
        }
      },
    },
    {
      framework: 'mikata',
      category: 'memory',
      name: 'mount dispose leak sentinel 100x',
      mode: 'stress',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const dispose = runtime.render(() => {
            const root = runtime._template('<section><p>tracked</p></section>').cloneNode(true) as HTMLElement;
            reactivity.onCleanup(() => { leakCleanups++; });
            return root;
          }, container);
          dispose();
          sink += container.childNodes.length;
        }
        sink += leakCleanups;
      },
    },
    {
      framework: 'mikata',
      category: 'scheduler',
      name: 'batch 20 signal writes 100x',
      mode: 'stress',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          reactivity.batch(() => {
            for (const [, write] of schedulerSignals) {
              write((value: number) => value + 1);
            }
          });
          reactivity.flushSync();
        }
        sink += schedulerContainer.textContent?.length ?? 0;
      },
      cleanup: disposeScheduler,
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
    {
      framework: 'mikata',
      category: 'ssr',
      name: 'render full app page',
      mode: 'realistic',
      fn: () => {
        const { html } = server.renderToStaticString(() => fullPageHtml(fullPageRows, server.escapeText, server.escapeAttr));
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

  const appRoutes = ['overview', 'reports', 'settings'] as const;
  let setRoute!: (value: typeof appRoutes[number]) => void;
  const routeContainer = document.createElement('div');
  const routeRoot = ReactDOMClient.createRoot(routeContainer);
  function RouteApp(): unknown {
    const [route, updateRoute] = React.useState<typeof appRoutes[number]>('overview');
    setRoute = updateRoute;
    return h('section', null,
      h('nav', null, appRoutes.map((item) => h('button', { key: item, 'aria-current': route === item || undefined, onClick: () => updateRoute(item) }, item))),
      h('main', null, h('h2', null, route), h('p', null, route === 'reports' ? 'Nested report outlet' : route === 'settings' ? 'Nested settings outlet' : 'Nested overview outlet')),
    );
  }
  ReactDOM.flushSync(() => routeRoot.render(h(RouteApp)));

  let setAsyncStatus!: (value: 'idle' | 'loading' | 'success' | 'error') => void;
  let setAsyncData!: (value: string) => void;
  const asyncContainer = document.createElement('div');
  const asyncRoot = ReactDOMClient.createRoot(asyncContainer);
  function AsyncApp(): unknown {
    const [status, updateStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [data, updateData] = React.useState('none');
    setAsyncStatus = updateStatus;
    setAsyncData = updateData;
    return h('section', null, h('h2', null, status), h('p', null, status === 'success' ? data : status === 'error' ? 'failed' : 'waiting'), h('button', null, 'Retry'));
  }
  ReactDOM.flushSync(() => asyncRoot.render(h(AsyncApp)));

  const largeFormContainer = document.createElement('div');
  const largeFormRoot = ReactDOMClient.createRoot(largeFormContainer);
  function LargeFormApp(): unknown {
    const [values, setValues] = React.useState(() => Array.from({ length: 75 }, () => ''));
    return h('form', null,
      h('fieldset', null, values.map((value, index) => h('input', {
        key: index,
        name: `field-${index}`,
        value,
        onInput: (event: any) => {
          const nextValue = event.currentTarget.value;
          setValues((prev) => prev.map((item, i) => i === index ? nextValue : item));
        },
      }))),
      h('output', null, values.filter(Boolean).length),
    );
  }
  ReactDOM.flushSync(() => largeFormRoot.render(h(LargeFormApp)));
  const largeFormInputs = Array.from(largeFormContainer.querySelectorAll('input'));

  const tableBaseRows = createValueRows(500);
  let tableCurrentRows = tableBaseRows;
  let setTableRows!: (value: Array<{ id: number; label: string; value: number }>) => void;
  let setTableFilter!: (value: string) => void;
  let setTableSortAsc!: (value: boolean | ((value: boolean) => boolean)) => void;
  let setTablePage!: (value: number) => void;
  let setTableSelectedId!: (value: number | null) => void;
  const tableContainer = document.createElement('div');
  const tableRoot = ReactDOMClient.createRoot(tableContainer);
  function TableApp(): unknown {
    const [items, updateItems] = React.useState(tableBaseRows);
    const [filter, updateFilter] = React.useState('');
    const [sortAsc, updateSortAsc] = React.useState(true);
    const [page, updatePage] = React.useState(0);
    const [selectedId, updateSelectedId] = React.useState<number | null>(null);
    setTableRows = updateItems;
    setTableFilter = updateFilter;
    setTableSortAsc = updateSortAsc;
    setTablePage = updatePage;
    setTableSelectedId = updateSelectedId;
    const visible = [...items]
      .filter((row) => row.label.includes(filter))
      .sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id)
      .slice(page * 25, page * 25 + 25);
    return h('table', null, h('tbody', null, visible.map((item) => h('tr', {
      key: item.id,
      'aria-selected': selectedId === item.id || undefined,
      onClick: () => updateSelectedId(item.id),
    }, h('td', null, item.label), h('td', null, item.value), h('td', null, item.id)))));
  }
  ReactDOM.flushSync(() => tableRoot.render(h(TableApp)));

  let setOverlayOpen!: (value: boolean | ((value: boolean) => boolean)) => void;
  let overlayCleanups = 0;
  const overlayContainer = document.createElement('div');
  const overlayRoot = ReactDOMClient.createRoot(overlayContainer);
  function ModalPanel(): unknown {
    React.useEffect(() => {
      const onKey = () => {};
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('keydown', onKey);
        overlayCleanups++;
      };
    }, []);
    return h('dialog', { open: true }, h('button', null, 'Close'));
  }
  function OverlayApp(): unknown {
    const [open, updateOpen] = React.useState(false);
    setOverlayOpen = updateOpen;
    return h('section', null, open ? h(ModalPanel) : h('span', null, 'Closed'));
  }
  ReactDOM.flushSync(() => overlayRoot.render(h(OverlayApp)));

  const ContextSeed = React.createContext(0);
  let setContextSeed!: (value: number | ((value: number) => number)) => void;
  const contextContainer = document.createElement('div');
  const contextRoot = ReactDOMClient.createRoot(contextContainer);
  function ContextConsumer({ offset }: { offset: number }): unknown {
    return h('p', null, React.useContext(ContextSeed) + offset);
  }
  function ContextApp(): unknown {
    const [seed, updateSeed] = React.useState(0);
    setContextSeed = updateSeed;
    return h(ContextSeed.Provider, { value: seed }, h('section', null, Array.from({ length: 50 }, (_, index) => h(ContextConsumer, { key: index, offset: index }))));
  }
  ReactDOM.flushSync(() => contextRoot.render(h(ContextApp)));

  const fullPageRows = createRows(160);
  function FullPage(): unknown {
    return h('main', { className: 'app-shell', 'data-route': 'reports' },
      h('header', null, h('h1', null, 'Ops dashboard'), h('nav', null, h('a', { className: 'active', href: '/reports' }, 'Reports'), h('a', { href: '/settings' }, 'Settings'))),
      h('section', { className: 'summary' }, h('h2', null, 'Revenue'), h('p', null, 'Regional performance'), h('output', null, 'ready')),
      h('form', null, h('label', null, 'Search', h('input', { name: 'q', defaultValue: 'north' })), h('button', { disabled: true }, 'Search')),
      h('table', null, h('tbody', null, fullPageRows.slice(0, 80).map((item) => h('tr', { key: item.id, 'data-id': item.id }, h('td', null, item.label), h('td', null, h('a', { href: `/rows/${item.id}`, title: item.label }, 'Open')))))),
      h('aside', null, 'Loaded'),
    );
  }
  const reactFullPageHtml = ReactDOMServer.renderToString(h(FullPage));

  let leakCleanups = 0;
  let setSchedulerValues!: (value: number[] | ((value: number[]) => number[])) => void;
  const schedulerContainer = document.createElement('div');
  const schedulerRoot = ReactDOMClient.createRoot(schedulerContainer);
  function SchedulerApp(): unknown {
    const [values, updateValues] = React.useState(() => Array.from({ length: 20 }, () => 0));
    setSchedulerValues = updateValues;
    return h('section', null, h('output', null, values.reduce((total, value) => total + value, 0)));
  }
  ReactDOM.flushSync(() => schedulerRoot.render(h(SchedulerApp)));

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
      category: 'routing',
      name: 'navigate nested app shell 200x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 200; i++) {
          ReactDOM.flushSync(() => setRoute(appRoutes[i % appRoutes.length]));
        }
        sink += routeContainer.textContent?.length ?? 0;
      },
      cleanup: () => routeRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'async',
      name: 'query lifecycle refetch recovery 100x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          ReactDOM.flushSync(() => setAsyncStatus('loading'));
          ReactDOM.flushSync(() => {
            setAsyncData(`row-${i}`);
            setAsyncStatus('success');
          });
          ReactDOM.flushSync(() => setAsyncStatus('error'));
          ReactDOM.flushSync(() => {
            setAsyncData(`retry-${i}`);
            setAsyncStatus('success');
          });
        }
        sink += asyncContainer.textContent?.length ?? 0;
      },
      cleanup: () => asyncRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'forms',
      name: 'large validated form flow 20x',
      mode: 'realistic',
      fn: () => {
        for (let round = 0; round < 20; round++) {
          for (let i = 0; i < largeFormInputs.length; i++) {
            ReactDOM.flushSync(() => dispatchInput(largeFormInputs[i]!, `v-${round}-${i}`));
          }
          for (let i = 0; i < largeFormInputs.length; i += 3) {
            ReactDOM.flushSync(() => dispatchInput(largeFormInputs[i]!, ''));
          }
        }
        sink += largeFormContainer.textContent?.length ?? 0;
      },
      cleanup: () => largeFormRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'table',
      name: 'sort filter paginate edit select 50x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 50; i++) {
          tableCurrentRows = tableCurrentRows.map((row, index) => index === i ? { ...row, value: row.value + i + 1 } : row);
          ReactDOM.flushSync(() => {
            setTableRows(tableCurrentRows);
            setTableFilter(i % 3 === 0 ? '1' : '');
            setTableSortAsc((value) => !value);
            setTablePage(i % 4);
            setTableSelectedId(i);
          });
        }
        sink += tableContainer.textContent?.length ?? 0;
      },
      cleanup: () => tableRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'lifecycle',
      name: 'modal listener cleanup 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          ReactDOM.flushSync(() => setOverlayOpen((value) => !value));
        }
        sink += overlayContainer.textContent?.length ?? 0;
        sink += overlayCleanups;
      },
      cleanup: () => overlayRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'context',
      name: 'deep provider consumers update 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          ReactDOM.flushSync(() => setContextSeed((value) => value + 1));
        }
        sink += contextContainer.textContent?.length ?? 0;
      },
      cleanup: () => contextRoot.unmount(),
    },
    {
      framework: 'react',
      category: 'hydration',
      name: 'hydrate full app page 50x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 50; i++) {
          const container = document.createElement('div');
          container.innerHTML = reactFullPageHtml;
          document.body.appendChild(container);
          const root = ReactDOMClient.hydrateRoot(container, h(FullPage), { onRecoverableError: () => {} });
          await new Promise((resolve) => setTimeout(resolve, 1));
          root.unmount();
          container.remove();
          sink += container.textContent?.length ?? 0;
        }
      },
    },
    {
      framework: 'react',
      category: 'memory',
      name: 'mount dispose leak sentinel 100x',
      mode: 'stress',
      fn: () => {
        function LeakSentinel(): unknown {
          React.useEffect(() => () => { leakCleanups++; }, []);
          return h('section', null, h('p', null, 'tracked'));
        }
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const root = ReactDOMClient.createRoot(container);
          ReactDOM.flushSync(() => root.render(h(LeakSentinel)));
          root.unmount();
          sink += container.childNodes.length;
        }
        sink += leakCleanups;
      },
    },
    {
      framework: 'react',
      category: 'scheduler',
      name: 'batch 20 signal writes 100x',
      mode: 'stress',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          ReactDOM.flushSync(() => setSchedulerValues((values) => values.map((value) => value + 1)));
        }
        sink += schedulerContainer.textContent?.length ?? 0;
      },
      cleanup: () => schedulerRoot.unmount(),
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
    {
      framework: 'react',
      category: 'ssr',
      name: 'render full app page',
      mode: 'realistic',
      fn: () => {
        const html = ReactDOMServer.renderToString(h(FullPage));
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

  const appRoutes = ['overview', 'reports', 'settings'] as const;
  const route = Vue.ref<typeof appRoutes[number]>('overview');
  const routeContainer = document.createElement('div');
  const routeApp = Vue.createApp({
    setup: () => () => Vue.h('section', [
      Vue.h('nav', appRoutes.map((item) => Vue.h('button', { 'aria-current': route.value === item || undefined, onClick: () => { route.value = item; } }, item))),
      Vue.h('main', [Vue.h('h2', route.value), Vue.h('p', route.value === 'reports' ? 'Nested report outlet' : route.value === 'settings' ? 'Nested settings outlet' : 'Nested overview outlet')]),
    ]),
  });
  routeApp.mount(routeContainer);

  const asyncStatus = Vue.ref<'idle' | 'loading' | 'success' | 'error'>('idle');
  const asyncData = Vue.ref('none');
  const asyncContainer = document.createElement('div');
  const asyncApp = Vue.createApp({
    setup: () => () => Vue.h('section', [
      Vue.h('h2', asyncStatus.value),
      Vue.h('p', asyncStatus.value === 'success' ? asyncData.value : asyncStatus.value === 'error' ? 'failed' : 'waiting'),
      Vue.h('button', 'Retry'),
    ]),
  });
  asyncApp.mount(asyncContainer);

  const largeFormValues = Vue.ref(Array.from({ length: 75 }, () => ''));
  const largeFormContainer = document.createElement('div');
  const largeFormApp = Vue.createApp({
    setup: () => () => Vue.h('form', [
      Vue.h('fieldset', largeFormValues.value.map((value, index) => Vue.h('input', {
        key: index,
        name: `field-${index}`,
        value,
        onInput: (event: Event) => {
          largeFormValues.value = largeFormValues.value.map((item, i) => i === index ? (event.currentTarget as HTMLInputElement).value : item);
        },
      }))),
      Vue.h('output', String(largeFormValues.value.filter(Boolean).length)),
    ]),
  });
  largeFormApp.mount(largeFormContainer);
  const largeFormInputs = Array.from(largeFormContainer.querySelectorAll('input'));

  const tableBaseRows = createValueRows(500);
  let tableCurrentRows = tableBaseRows;
  const tableRows = Vue.ref(tableBaseRows);
  const tableFilter = Vue.ref('');
  const tableSortAsc = Vue.ref(true);
  const tablePage = Vue.ref(0);
  const tableSelectedId = Vue.ref<number | null>(null);
  const tableContainer = document.createElement('div');
  const tableApp = Vue.createApp({
    setup: () => () => {
      const visibleRows = [...tableRows.value]
        .filter((row) => row.label.includes(tableFilter.value))
        .sort((a, b) => tableSortAsc.value ? a.id - b.id : b.id - a.id)
        .slice(tablePage.value * 25, tablePage.value * 25 + 25);
      return Vue.h('table', [Vue.h('tbody', visibleRows.map((item) => Vue.h('tr', {
        key: item.id,
        'aria-selected': tableSelectedId.value === item.id || undefined,
        onClick: () => { tableSelectedId.value = item.id; },
      }, [Vue.h('td', item.label), Vue.h('td', String(item.value)), Vue.h('td', String(item.id))])))]);
    },
  });
  tableApp.mount(tableContainer);

  const overlayOpen = Vue.ref(false);
  let overlayCleanups = 0;
  const ModalPanel = {
    setup() {
      const onKey = () => {};
      document.addEventListener('keydown', onKey);
      Vue.onUnmounted(() => {
        document.removeEventListener('keydown', onKey);
        overlayCleanups++;
      });
      return () => Vue.h('dialog', { open: true }, [Vue.h('button', 'Close')]);
    },
  };
  const overlayContainer = document.createElement('div');
  const overlayApp = Vue.createApp({
    setup: () => () => Vue.h('section', overlayOpen.value ? Vue.h(ModalPanel) : Vue.h('span', 'Closed')),
  });
  overlayApp.mount(overlayContainer);

  const ContextSeed = Symbol('context-seed');
  const contextSeed = Vue.ref(0);
  const contextContainer = document.createElement('div');
  const ContextConsumer = {
    props: ['offset'],
    setup(props: { offset: number }) {
      const seed = Vue.inject(ContextSeed) as { value: number };
      return () => Vue.h('p', String(seed.value + props.offset));
    },
  };
  const contextApp = Vue.createApp({
    setup() {
      Vue.provide(ContextSeed, contextSeed);
      return () => Vue.h('section', Array.from({ length: 50 }, (_, index) => Vue.h(ContextConsumer, { key: index, offset: index })));
    },
  });
  contextApp.mount(contextContainer);

  const fullPageRows = createRows(160);
  const FullPage = {
    render: () => Vue.h('main', { class: 'app-shell', 'data-route': 'reports' }, [
      Vue.h('header', [Vue.h('h1', 'Ops dashboard'), Vue.h('nav', [Vue.h('a', { class: 'active', href: '/reports' }, 'Reports'), Vue.h('a', { href: '/settings' }, 'Settings')])]),
      Vue.h('section', { class: 'summary' }, [Vue.h('h2', 'Revenue'), Vue.h('p', 'Regional performance'), Vue.h('output', 'ready')]),
      Vue.h('form', [Vue.h('label', ['Search', Vue.h('input', { name: 'q', value: 'north' })]), Vue.h('button', { disabled: true }, 'Search')]),
      Vue.h('table', [Vue.h('tbody', fullPageRows.slice(0, 80).map((item) => Vue.h('tr', { key: item.id, 'data-id': item.id }, [Vue.h('td', item.label), Vue.h('td', [Vue.h('a', { href: `/rows/${item.id}`, title: item.label }, 'Open')])])))]),
      Vue.h('aside', 'Loaded'),
    ]),
  };
  const vueFullPageHtml = VueServer ? await VueServer.renderToString(Vue.createSSRApp(FullPage)) : '';

  let leakCleanups = 0;
  const schedulerValues = Vue.ref(Array.from({ length: 20 }, () => 0));
  const schedulerContainer = document.createElement('div');
  const schedulerApp = Vue.createApp({
    setup: () => () => Vue.h('section', [Vue.h('output', String(schedulerValues.value.reduce((total, value) => total + value, 0)))]),
  });
  schedulerApp.mount(schedulerContainer);

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
    {
      framework: 'vue',
      category: 'routing',
      name: 'navigate nested app shell 200x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 200; i++) {
          route.value = appRoutes[i % appRoutes.length];
          await Vue.nextTick();
        }
        sink += routeContainer.textContent?.length ?? 0;
      },
      cleanup: () => routeApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'async',
      name: 'query lifecycle refetch recovery 100x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 100; i++) {
          asyncStatus.value = 'loading';
          await Vue.nextTick();
          asyncData.value = `row-${i}`;
          asyncStatus.value = 'success';
          await Vue.nextTick();
          asyncStatus.value = 'error';
          await Vue.nextTick();
          asyncData.value = `retry-${i}`;
          asyncStatus.value = 'success';
          await Vue.nextTick();
        }
        sink += asyncContainer.textContent?.length ?? 0;
      },
      cleanup: () => asyncApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'forms',
      name: 'large validated form flow 20x',
      mode: 'realistic',
      fn: async () => {
        for (let round = 0; round < 20; round++) {
          for (let i = 0; i < largeFormInputs.length; i++) {
            dispatchInput(largeFormInputs[i]!, `v-${round}-${i}`);
          }
          await Vue.nextTick();
          for (let i = 0; i < largeFormInputs.length; i += 3) {
            dispatchInput(largeFormInputs[i]!, '');
          }
          await Vue.nextTick();
        }
        sink += largeFormContainer.textContent?.length ?? 0;
      },
      cleanup: () => largeFormApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'table',
      name: 'sort filter paginate edit select 50x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 50; i++) {
          tableCurrentRows = tableCurrentRows.map((row, index) => index === i ? { ...row, value: row.value + i + 1 } : row);
          tableRows.value = tableCurrentRows;
          tableFilter.value = i % 3 === 0 ? '1' : '';
          tableSortAsc.value = !tableSortAsc.value;
          tablePage.value = i % 4;
          tableSelectedId.value = i;
          await Vue.nextTick();
        }
        sink += tableContainer.textContent?.length ?? 0;
      },
      cleanup: () => tableApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'lifecycle',
      name: 'modal listener cleanup 250x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 250; i++) {
          overlayOpen.value = !overlayOpen.value;
          await Vue.nextTick();
        }
        sink += overlayContainer.textContent?.length ?? 0;
        sink += overlayCleanups;
      },
      cleanup: () => overlayApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'context',
      name: 'deep provider consumers update 250x',
      mode: 'realistic',
      fn: async () => {
        for (let i = 0; i < 250; i++) {
          contextSeed.value += 1;
          await Vue.nextTick();
        }
        sink += contextContainer.textContent?.length ?? 0;
      },
      cleanup: () => contextApp.unmount(),
    },
    {
      framework: 'vue',
      category: 'memory',
      name: 'mount dispose leak sentinel 100x',
      mode: 'stress',
      fn: () => {
        const LeakSentinel = {
          setup() {
            Vue.onUnmounted(() => { leakCleanups++; });
            return () => Vue.h('section', [Vue.h('p', 'tracked')]);
          },
        };
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const app = Vue.createApp(LeakSentinel);
          app.mount(container);
          app.unmount();
          sink += container.childNodes.length;
        }
        sink += leakCleanups;
      },
    },
    {
      framework: 'vue',
      category: 'scheduler',
      name: 'batch 20 signal writes 100x',
      mode: 'stress',
      fn: async () => {
        for (let i = 0; i < 100; i++) {
          schedulerValues.value = schedulerValues.value.map((value) => value + 1);
          await Vue.nextTick();
        }
        sink += schedulerContainer.textContent?.length ?? 0;
      },
      cleanup: () => schedulerApp.unmount(),
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
    cases.push({
      framework: 'vue',
      category: 'hydration',
      name: 'hydrate full app page 50x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 50; i++) {
          const container = document.createElement('div');
          container.innerHTML = vueFullPageHtml;
          const app = Vue.createSSRApp(FullPage);
          app.mount(container);
          app.unmount();
          sink += container.textContent?.length ?? 0;
        }
      },
    });
    cases.push({
      framework: 'vue',
      category: 'ssr',
      name: 'render full app page',
      mode: 'realistic',
      fn: async () => {
        const html = await VueServer.renderToString(Vue.createSSRApp(FullPage));
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
  const appRoutes = ['overview', 'reports', 'settings'] as const;
  const routeContainer = document.createElement('div');
  let setRoute!: (value: typeof appRoutes[number]) => void;
  const disposeRoute = SolidWeb.render(() => {
    const [route, updateRoute] = Solid.createSignal<typeof appRoutes[number]>('overview');
    setRoute = updateRoute;
    const root = document.createElement('section');
    const nav = document.createElement('nav');
    const main = document.createElement('main');
    const title = document.createElement('h2');
    const body = document.createElement('p');
    const buttons = appRoutes.map((item) => {
      const button = document.createElement('button');
      button.textContent = item;
      button.addEventListener('click', () => updateRoute(item));
      nav.appendChild(button);
      return button;
    });
    Solid.createEffect(() => {
      const current = route();
      title.textContent = current;
      body.textContent = current === 'reports' ? 'Nested report outlet' : current === 'settings' ? 'Nested settings outlet' : 'Nested overview outlet';
      buttons.forEach((button, index) => {
        button.toggleAttribute('aria-current', index === (current === 'overview' ? 0 : current === 'reports' ? 1 : 2));
      });
    });
    main.append(title, body);
    root.append(nav, main);
    return root;
  }, routeContainer);

  const asyncContainer = document.createElement('div');
  let setAsyncStatus!: (value: 'idle' | 'loading' | 'success' | 'error') => void;
  let setAsyncData!: (value: string) => void;
  const disposeAsync = SolidWeb.render(() => {
    const [status, updateStatus] = Solid.createSignal<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [data, updateData] = Solid.createSignal('none');
    setAsyncStatus = updateStatus;
    setAsyncData = updateData;
    const root = document.createElement('section');
    const title = document.createElement('h2');
    const body = document.createElement('p');
    const button = document.createElement('button');
    button.textContent = 'Retry';
    Solid.createEffect(() => {
      title.textContent = status();
      body.textContent = status() === 'success' ? data() : status() === 'error' ? 'failed' : 'waiting';
    });
    root.append(title, body, button);
    return root;
  }, asyncContainer);

  const largeFormValues = Array.from({ length: 75 }, () => '');
  const largeFormContainer = document.createElement('div');
  let largeFormInputs: HTMLInputElement[] = [];
  const disposeLargeForm = SolidWeb.render(() => {
    const [version, setVersion] = Solid.createSignal(0);
    const form = document.createElement('form');
    const fieldset = document.createElement('fieldset');
    const output = document.createElement('output');
    largeFormInputs = [];
    for (let i = 0; i < largeFormValues.length; i++) {
      const input = document.createElement('input');
      input.name = `field-${i}`;
      input.addEventListener('input', () => {
        largeFormValues[i] = input.value;
        setVersion((value: number) => value + 1);
      });
      largeFormInputs.push(input);
      fieldset.appendChild(input);
    }
    Solid.createEffect(() => {
      version();
      output.textContent = String(largeFormValues.filter(Boolean).length);
    });
    form.append(fieldset, output);
    return form;
  }, largeFormContainer);

  const tableBaseRows = createValueRows(500);
  let tableCurrentRows = tableBaseRows;
  const tableContainer = document.createElement('div');
  let setTableRows!: (value: Array<{ id: number; label: string; value: number }>) => void;
  let setTableFilter!: (value: string) => void;
  let setTableSortAsc!: (value: boolean | ((value: boolean) => boolean)) => void;
  let setTablePage!: (value: number) => void;
  let setTableSelectedId!: (value: number | null) => void;
  const disposeTable = SolidWeb.render(() => {
    const [items, updateItems] = Solid.createSignal(tableBaseRows);
    const [filter, updateFilter] = Solid.createSignal('');
    const [sortAsc, updateSortAsc] = Solid.createSignal(true);
    const [page, updatePage] = Solid.createSignal(0);
    const [selectedId, updateSelectedId] = Solid.createSignal<number | null>(null);
    setTableRows = updateItems;
    setTableFilter = updateFilter;
    setTableSortAsc = updateSortAsc;
    setTablePage = updatePage;
    setTableSelectedId = updateSelectedId;
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    Solid.createEffect(() => {
      const visible = [...items()]
        .filter((row) => row.label.includes(filter()))
        .sort((a, b) => sortAsc() ? a.id - b.id : b.id - a.id)
        .slice(page() * 25, page() * 25 + 25);
      tbody.replaceChildren(...visible.map((item) => {
        const tr = document.createElement('tr');
        tr.toggleAttribute('aria-selected', selectedId() === item.id);
        tr.addEventListener('click', () => updateSelectedId(item.id));
        const label = document.createElement('td');
        const value = document.createElement('td');
        const id = document.createElement('td');
        label.textContent = item.label;
        value.textContent = String(item.value);
        id.textContent = String(item.id);
        tr.append(label, value, id);
        return tr;
      }));
    });
    table.appendChild(tbody);
    return table;
  }, tableContainer);

  const overlayContainer = document.createElement('div');
  let setOverlayOpen!: (value: boolean | ((value: boolean) => boolean)) => void;
  let overlayCleanups = 0;
  const disposeOverlay = SolidWeb.render(() => {
    const [open, updateOpen] = Solid.createSignal(false);
    setOverlayOpen = updateOpen;
    const root = document.createElement('section');
    Solid.createEffect(() => {
      if (open()) {
        const dialog = document.createElement('dialog');
        const button = document.createElement('button');
        const onKey = () => {};
        dialog.open = true;
        button.textContent = 'Close';
        dialog.appendChild(button);
        document.addEventListener('keydown', onKey);
        Solid.onCleanup(() => {
          document.removeEventListener('keydown', onKey);
          overlayCleanups++;
        });
        root.replaceChildren(dialog);
      } else {
        const span = document.createElement('span');
        span.textContent = 'Closed';
        root.replaceChildren(span);
      }
    });
    return root;
  }, overlayContainer);

  const ContextSeed = Solid.createContext<() => number>();
  const contextContainer = document.createElement('div');
  let setContextSeed!: (value: number | ((value: number) => number)) => void;
  function ContextConsumer(props: { offset: number }): HTMLParagraphElement {
    const seed = Solid.useContext(ContextSeed)!;
    const p = document.createElement('p');
    Solid.createEffect(() => {
      p.textContent = String(seed() + props.offset);
    });
    return p;
  }
  const disposeContext = SolidWeb.render(() => {
    const [seed, updateSeed] = Solid.createSignal(0);
    setContextSeed = updateSeed;
    const root = document.createElement('section');
    return Solid.createComponent(ContextSeed.Provider, {
      value: seed,
      get children() {
        root.replaceChildren(...Array.from({ length: 50 }, (_, index) => ContextConsumer({ offset: index })));
        return root;
      },
    });
  }, contextContainer);

  const fullPageRows = createRows(160);
  let leakCleanups = 0;
  const schedulerRoot = Solid.createRoot((dispose: () => void) => {
    const signals = Array.from({ length: 20 }, () => Solid.createSignal(0));
    const container = document.createElement('div');
    const disposeRender = SolidWeb.render(() => {
      const section = document.createElement('section');
      const output = document.createElement('output');
      Solid.createEffect(() => {
        output.textContent = String(signals.reduce((total, [read]) => total + read(), 0));
      });
      section.appendChild(output);
      return section;
    }, container);
    return { dispose: () => { disposeRender(); dispose(); }, signals, container };
  });

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
    {
      framework: 'solid',
      category: 'routing',
      name: 'navigate nested app shell 200x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 200; i++) {
          setRoute(appRoutes[i % appRoutes.length]);
        }
        sink += routeContainer.textContent?.length ?? 0;
      },
      cleanup: disposeRoute,
    },
    {
      framework: 'solid',
      category: 'async',
      name: 'query lifecycle refetch recovery 100x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          setAsyncStatus('loading');
          setAsyncData(`row-${i}`);
          setAsyncStatus('success');
          setAsyncStatus('error');
          setAsyncData(`retry-${i}`);
          setAsyncStatus('success');
        }
        sink += asyncContainer.textContent?.length ?? 0;
      },
      cleanup: disposeAsync,
    },
    {
      framework: 'solid',
      category: 'forms',
      name: 'large validated form flow 20x',
      mode: 'realistic',
      fn: () => {
        for (let round = 0; round < 20; round++) {
          for (let i = 0; i < largeFormInputs.length; i++) {
            dispatchInput(largeFormInputs[i]!, `v-${round}-${i}`);
          }
          for (let i = 0; i < largeFormInputs.length; i += 3) {
            dispatchInput(largeFormInputs[i]!, '');
          }
        }
        sink += largeFormContainer.textContent?.length ?? 0;
      },
      cleanup: disposeLargeForm,
    },
    {
      framework: 'solid',
      category: 'table',
      name: 'sort filter paginate edit select 50x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 50; i++) {
          tableCurrentRows = tableCurrentRows.map((row, index) => index === i ? { ...row, value: row.value + i + 1 } : row);
          setTableRows(tableCurrentRows);
          setTableFilter(i % 3 === 0 ? '1' : '');
          setTableSortAsc((value: boolean) => !value);
          setTablePage(i % 4);
          setTableSelectedId(i);
        }
        sink += tableContainer.textContent?.length ?? 0;
      },
      cleanup: disposeTable,
    },
    {
      framework: 'solid',
      category: 'lifecycle',
      name: 'modal listener cleanup 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setOverlayOpen((value: boolean) => !value);
        }
        sink += overlayContainer.textContent?.length ?? 0;
        sink += overlayCleanups;
      },
      cleanup: disposeOverlay,
    },
    {
      framework: 'solid',
      category: 'context',
      name: 'deep provider consumers update 250x',
      mode: 'realistic',
      fn: () => {
        for (let i = 0; i < 250; i++) {
          setContextSeed((value: number) => value + 1);
        }
        sink += contextContainer.textContent?.length ?? 0;
      },
      cleanup: disposeContext,
    },
    {
      framework: 'solid',
      category: 'memory',
      name: 'mount dispose leak sentinel 100x',
      mode: 'stress',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const container = document.createElement('div');
          const dispose = SolidWeb.render(() => {
            Solid.onCleanup(() => { leakCleanups++; });
            const section = document.createElement('section');
            const p = document.createElement('p');
            p.textContent = 'tracked';
            section.appendChild(p);
            return section;
          }, container);
          dispose();
          sink += container.childNodes.length;
        }
        sink += leakCleanups;
      },
    },
    {
      framework: 'solid',
      category: 'scheduler',
      name: 'batch 20 signal writes 100x',
      mode: 'stress',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          Solid.batch(() => {
            for (const [, write] of schedulerRoot.signals) {
              write((value: number) => value + 1);
            }
          });
        }
        sink += schedulerRoot.container.textContent?.length ?? 0;
      },
      cleanup: () => schedulerRoot.dispose(),
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
    cases.push({
      framework: 'solid',
      category: 'ssr',
      name: 'render full app page',
      mode: 'realistic',
      fn: () => {
        const html = SolidServer.renderToString(() => SolidServer.ssr(
          ['<main class="app-shell" data-route="reports"><header><h1>Ops dashboard</h1><nav><a class="active" href="/reports">Reports</a><a href="/settings">Settings</a></nav></header><section class="summary"><h2>Revenue</h2><p>Regional performance</p><output>ready</output></section><form><label>Search<input name="q" value="north"></label><button disabled>Search</button></form><table><tbody>', '</tbody></table><aside>Loaded</aside></main>'],
          fullPageRows.slice(0, 80).map((item) => SolidServer.ssr(
            [`<tr data-id="${item.id}"><td>`, `</td><td><a href="/rows/${item.id}" title="${item.label}">Open</a></td></tr>`],
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
    const FullPage = await compileSvelteServerComponent(
      'FullPage',
      '<script>let { rows = [] } = $props();</script><main class="app-shell" data-route="reports"><header><h1>Ops dashboard</h1><nav><a class="active" href="/reports">Reports</a><a href="/settings">Settings</a></nav></header><section class="summary"><h2>Revenue</h2><p>Regional performance</p><output>ready</output></section><form><label>Search<input name="q" value="north"></label><button disabled>Search</button></form><table><tbody>{#each rows.slice(0, 80) as row (row.id)}<tr data-id={row.id}><td>{row.label}</td><td><a href={`/rows/${row.id}`} title={row.label}>Open</a></td></tr>{/each}</tbody></table><aside>Loaded</aside></main>',
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
    if (FullPage) {
      cases.push({
        framework: 'svelte',
        category: 'ssr',
        name: 'render full app page',
        mode: 'realistic',
        fn: () => {
          const { body } = SvelteServer.render(FullPage, { props: { rows } });
          sink += body.length;
        },
      });
    }
  }

  return cases;
}
