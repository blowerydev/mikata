import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import { mikataJSXPlugin } from '../src/transform';

function transform(code: string): string {
  const result = transformSync(code, {
    filename: 'test.tsx',
    plugins: [
      ['@babel/plugin-syntax-typescript', { isTSX: true }],
      mikataJSXPlugin,
    ],
  });
  return result?.code ?? '';
}

describe('JSX transform', () => {
  it('emits a module-scope _template for a static element', () => {
    const output = transform(`const el = <div class="container">Hello</div>;`);
    expect(output).toContain('_template(');
    // Static string attr and text bake directly into the template HTML
    // (string-escaped inside the emitted JS source).
    expect(output).toContain('class=\\"container\\"');
    expect(output).toContain('Hello');
    // Per-instantiation: cloneNode(true) off the template.
    expect(output).toContain('.cloneNode(true)');
  });

  it('transforms event handlers to addEventListener', () => {
    const output = transform(`const el = <button onClick={handler}>Click</button>;`);
    expect(output).toContain('addEventListener');
    expect(output).toContain('"click"');
    expect(output).toContain('handler');
  });

  it('wraps dynamic attributes in renderEffect', () => {
    const output = transform(`const el = <div class={active()}>test</div>;`);
    expect(output).toContain('renderEffect');
    expect(output).toContain('_setProp');
    expect(output).toContain('active()');
  });

  it('transforms components with _createComponent', () => {
    const output = transform(`const el = <Counter count={5} />;`);
    expect(output).toContain('_createComponent');
    expect(output).toContain('Counter');
    expect(output).toContain('count');
  });

  it('creates getters for reactive component props', () => {
    const output = transform(`const el = <Counter count={count()} />;`);
    expect(output).toContain('_createComponent');
    expect(output).toContain('get count');
  });

  it('adds runtime imports', () => {
    const output = transform(`const el = <div>Hello</div>;`);
    expect(output).toContain(`from "@mikata/runtime"`);
    expect(output).toContain('_template');
  });

  it('inlines static element children into the template HTML', () => {
    const output = transform(`const el = <ul><li>One</li><li>Two</li></ul>;`);
    // Whole subtree bakes into one template — no per-child createElement.
    expect(output).toContain('<ul><li>One</li><li>Two</li></ul>');
    expect(output).not.toContain('appendChild');
  });

  it('handles dynamic text children via _insert', () => {
    const output = transform(`const el = <span>{count()}</span>;`);
    expect(output).toContain('_insert');
    expect(output).toContain('count()');
  });

  it('handles fragments', () => {
    const output = transform(`const el = <><span>A</span><span>B</span></>;`);
    expect(output).toContain('_createFragment');
  });

  it('bakes static props into the template without renderEffect', () => {
    const output = transform(`const el = <div id="main">test</div>;`);
    expect(output).toContain('id=\\"main\\"');
    expect(output).not.toContain('renderEffect');
    expect(output).not.toContain('_setProp');
  });

  it('emits anchor markers only for non-tail dynamic children', () => {
    const output = transform(
      `const el = <p>Count: {count()} | Doubled: {doubled()}</p>;`
    );
    // First dynamic slot has a following sibling → comment marker in template
    // and _insert takes a marker argument.
    expect(output).toContain('<!>');
    expect(output).toMatch(/_insert\([^,]+,\s*\(\)\s*=>\s*count\(\),\s*_el/);
    // Last dynamic slot needs no marker — _insert takes only two args.
    expect(output).toMatch(/_insert\([^,]+,\s*\(\)\s*=>\s*doubled\(\)\)/);
  });

  it('preserves inline whitespace in JSX text', () => {
    const output = transform(
      `const el = <p>Count: {count()} done</p>;`
    );
    // Trailing space after "Count:" and surrounding spaces around "done" must
    // survive inside the template HTML so rendered text doesn't squash.
    expect(output).toContain('Count: ');
    expect(output).toContain(' done');
  });

  it('walks via firstChild / nextSibling for wired descendants', () => {
    const output = transform(
      `const el = <div><span>static</span><a onClick={h}>click</a></div>;`
    );
    // Only the <a> needs wiring; walker reaches it via firstChild.nextSibling.
    expect(output).toContain('firstChild');
    expect(output).toContain('nextSibling');
    expect(output).toContain('addEventListener');
  });

  it('auto-labels signal() with its destructured name', () => {
    const output = transform(`const [count, setCount] = signal(0);`);
    expect(output).toContain('signal(0, "count")');
  });

  it('auto-labels computed() with its binding name', () => {
    const output = transform(`const doubled = computed(() => count() * 2);`);
    expect(output).toContain('"doubled"');
  });

  it('does not re-label signal() when a label is already provided', () => {
    const output = transform(`const [count, setCount] = signal(0, "explicit");`);
    expect(output).toContain('"explicit"');
    expect(output).not.toContain('"count"');
  });

  it('does not re-label computed() when a label is already provided', () => {
    const output = transform(`const doubled = computed(() => count() * 2, "dbl");`);
    expect(output).toContain('"dbl"');
    expect(output).not.toContain('"doubled"');
  });
});
