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
});
