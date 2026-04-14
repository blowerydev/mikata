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
  it('transforms a static element', () => {
    const output = transform(`const el = <div class="container">Hello</div>;`);
    expect(output).toContain('_createElement');
    expect(output).toContain('"div"');
    expect(output).toContain('"container"');
    expect(output).toContain('"Hello"');
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
    expect(output).toContain('_createElement');
  });

  it('handles children', () => {
    const output = transform(`const el = <ul><li>One</li><li>Two</li></ul>;`);
    expect(output).toContain('appendChild');
    expect(output).toContain('"li"');
  });

  it('handles dynamic text children', () => {
    const output = transform(`const el = <span>{count()}</span>;`);
    expect(output).toContain('_insert');
    expect(output).toContain('count()');
  });

  it('handles fragments', () => {
    const output = transform(`const el = <><span>A</span><span>B</span></>;`);
    expect(output).toContain('_createFragment');
  });

  it('handles static props without renderEffect', () => {
    const output = transform(`const el = <div id="main">test</div>;`);
    expect(output).toContain('_setProp');
    expect(output).not.toContain('renderEffect');
  });

  it('emits anchor markers for dynamic children followed by siblings', () => {
    const output = transform(
      `const el = <p>Count: {count()} | Doubled: {doubled()}</p>;`
    );
    // A followed-by-sibling dynamic child must get a marker passed to _insert
    // so updates preserve position instead of re-appending to the end.
    expect(output).toContain('createTextNode("")');
    // The first dynamic child ({count()}) has a following sibling → must have
    // three args to _insert (element, accessor, marker).
    expect(output).toMatch(/_insert\([^,]+,\s*\(\)\s*=>\s*count\(\),\s*_m/);
    // The last dynamic child ({doubled()}) has no sibling → two args.
    expect(output).toMatch(/_insert\([^,]+,\s*\(\)\s*=>\s*doubled\(\)\)/);
  });

  it('preserves inline whitespace in JSX text', () => {
    const output = transform(
      `const el = <p>Count: {count()} done</p>;`
    );
    // Trailing space after "Count:" and surrounding spaces around "done" must
    // survive so rendered text doesn't squash together.
    expect(output).toContain('"Count: "');
    expect(output).toContain('" done"');
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
