/**
 * Tests for the compiler's HMR code injection.
 */

import { describe, it, expect } from 'vitest';
import mikata from '../src/index';

// Get the transform function from the plugin
function getPlugin(hmr = true) {
  const plugin = mikata({ hmr }) as any;
  // Simulate vite config call to set enableHMR
  plugin.config({}, { command: 'serve' });
  return plugin;
}

function transformWithHMR(code: string): string {
  const plugin = getPlugin(true);
  const result = plugin.transform(code, 'src/components/Counter.tsx');
  return result?.code ?? '';
}

function transformWithoutHMR(code: string): string {
  const plugin = getPlugin(false);
  const result = plugin.transform(code, 'src/components/Counter.tsx');
  return result?.code ?? '';
}

describe('HMR injection', () => {
  it('injects _registerComponent for uppercase function declarations', () => {
    const code = `
      export function Counter() {
        return <div>count</div>;
      }
    `;
    const output = transformWithHMR(code);
    expect(output).toContain('_registerComponent');
    expect(output).toContain('Counter');
    expect(output).toContain('import.meta.hot');
    expect(output).toContain('_hotReplace');
  });

  it('does not inject HMR for lowercase functions (not components)', () => {
    const code = `
      function helperFn() {
        return <div>test</div>;
      }
    `;
    const output = transformWithHMR(code);
    expect(output).not.toContain('_registerComponent');
    expect(output).not.toContain('import.meta.hot');
  });

  it('does not inject HMR when disabled', () => {
    const code = `
      export function Counter() {
        return <div>count</div>;
      }
    `;
    const output = transformWithoutHMR(code);
    expect(output).not.toContain('_registerComponent');
    expect(output).not.toContain('import.meta.hot');
  });

  it('handles multiple components in one file', () => {
    const code = `
      export function Header() {
        return <header>Header</header>;
      }
      export function Footer() {
        return <footer>Footer</footer>;
      }
    `;
    const output = transformWithHMR(code);
    expect(output).toContain('_registerComponent');
    // Both components should be registered
    expect(output).toContain('Header');
    expect(output).toContain('Footer');
    // Both should be in the accept handler
    expect(output).toContain('mod.Header');
    expect(output).toContain('mod.Footer');
  });

  it('includes file path in the HMR ID', () => {
    const code = `
      export function Counter() {
        return <div>count</div>;
      }
    `;
    const output = transformWithHMR(code);
    expect(output).toContain('src/components/Counter.tsx::Counter');
  });

  it('converts export function to let for reassignment', () => {
    const code = `
      export function Counter() {
        return <div>count</div>;
      }
    `;
    const output = transformWithHMR(code);
    // Should be reassignable (let) not a function declaration
    expect(output).toContain('let Counter');
    // Should re-export
    expect(output).toContain('export { Counter }');
  });

  it('handles arrow function components', () => {
    const code = `
      export const Widget = () => {
        return <div>widget</div>;
      };
    `;
    const output = transformWithHMR(code);
    expect(output).toContain('_registerComponent');
    expect(output).toContain('Widget');
  });

  it('does not match component declarations inside template literals', () => {
    // Docs pages embed JSX code samples as template-literal strings.
    // The HMR injector must not treat `function TodoList()` inside a
    // string as a real top-level declaration - otherwise the injector
    // emits `TodoList = _registerComponent(...)` for an identifier
    // that doesn't exist in the module scope.
    const code = `
      import { CodeBlock, highlight } from './CodeBlock';

      const sample = await highlight(
        \`function TodoList() {
          return <div>sample</div>;
        }\`,
        'tsx',
      );

      export default function Page() {
        return <CodeBlock html={sample} />;
      }
    `;
    const output = transformWithHMR(code);
    expect(output).toContain('_registerComponent("src/components/Counter.tsx::Page"');
    expect(output).not.toContain('TodoList = _registerComponent');
    expect(output).not.toContain('let TodoList = function');
  });

  it('disables HMR in build mode', () => {
    const plugin = mikata({ hmr: true }) as any;
    // Simulate production build
    plugin.config({}, { command: 'build' });
    const result = plugin.transform(
      `export function Counter() { return <div>count</div>; }`,
      'src/Counter.tsx'
    );
    expect(result?.code ?? '').not.toContain('_registerComponent');
  });
});
