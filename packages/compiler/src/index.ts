/**
 * @mikata/compiler - Vite plugin for Mikata JSX transform.
 *
 * Transforms JSX in .tsx/.jsx files into direct DOM operations
 * using @mikata/runtime helpers. No virtual DOM.
 */

import type { Plugin } from 'vite';
import { transformSync } from '@babel/core';
import { mikataJSXPlugin } from './transform';

export interface MikataPluginOptions {
  /** Enable development mode warnings and diagnostics */
  dev?: boolean;
  /** Enable Hot Module Replacement (default: true in dev) */
  hmr?: boolean;
}

export default function mikata(options: MikataPluginOptions = {}): Plugin {
  const isDev = options.dev ?? true;
  let enableHMR = options.hmr ?? true;

  return {
    name: 'mikata-jsx',
    enforce: 'pre',

    config(_, env) {
      // Only enable HMR in serve (dev) mode
      if (env.command !== 'serve') {
        enableHMR = false;
      }

      return {
        esbuild: {
          jsx: 'preserve', // Let our plugin handle JSX, not esbuild
        },
        define: {
          __DEV__: JSON.stringify(isDev),
        },
      };
    },

    transform(code, id) {
      if (!/\.[tj]sx$/.test(id)) return null;

      const result = transformSync(code, {
        filename: id,
        plugins: [
          ['@babel/plugin-syntax-typescript', { isTSX: true }],
          mikataJSXPlugin,
        ],
        sourceMaps: true,
      });

      if (!result || !result.code) return null;

      let transformedCode = result.code;

      // Inject HMR boundary code in dev mode
      if (enableHMR) {
        transformedCode = injectHMR(transformedCode, id);
      }

      return {
        code: transformedCode,
        map: result.map,
      };
    },
  };
}

/**
 * Detect component functions in the transformed code and inject HMR
 * registration + accept code.
 *
 * A component is a function that:
 * - Starts with an uppercase letter
 * - Is exported or declared at the top level
 *
 * We look for patterns like:
 * - `function Counter(` - function declaration
 * - `const Counter = (` - arrow function / function expression
 * - `export function Counter(` - exported function
 * - `export const Counter = (` - exported arrow
 */
function injectHMR(code: string, filePath: string): string {
  // Match component function declarations and expressions
  const componentPattern =
    /(?:export\s+)?(?:(?:function\s+([A-Z]\w*)\s*\()|(?:(?:const|let|var)\s+([A-Z]\w*)\s*=\s*(?:\([^)]*\)\s*=>|function\s*\()))/g;

  const components: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = componentPattern.exec(code)) !== null) {
    const name = match[1] || match[2];
    if (name) {
      components.push(name);
    }
  }

  if (components.length === 0) return code;

  // Build HMR registration code
  const registrations = components
    .map((name) => {
      const hmrId = `${filePath}::${name}`;
      return `${name} = _registerComponent("${hmrId}", ${name});`;
    })
    .join('\n');

  // Build the accept handler
  const acceptBody = components
    .map((name) => {
      const hmrId = `${filePath}::${name}`;
      return `  if (mod.${name}) _hotReplace("${hmrId}", mod.${name});`;
    })
    .join('\n');

  // We need to make exported function declarations reassignable
  // by converting `export function Foo` to `let Foo = function Foo`, `export { Foo }`
  let modifiedCode = code;
  const reexports: string[] = [];

  for (const name of components) {
    // Handle `export function Name(`
    const exportFnPattern = new RegExp(
      `export\\s+function\\s+(${name})\\s*\\(`,
    );
    if (exportFnPattern.test(modifiedCode)) {
      // Remove 'export' from the function declaration so we can reassign it
      modifiedCode = modifiedCode.replace(
        exportFnPattern,
        `let ${name} = function ${name}(`,
      );
      // Need to close with a semicolon and add export
      reexports.push(name);
    }

    // Handle `export const Name =`
    const exportConstPattern = new RegExp(
      `export\\s+const\\s+(${name})\\s*=`,
    );
    if (exportConstPattern.test(modifiedCode)) {
      modifiedCode = modifiedCode.replace(
        exportConstPattern,
        `let ${name} =`,
      );
      reexports.push(name);
    }

    // Handle non-exported `function Name(`
    const fnPattern = new RegExp(`^(function\\s+${name}\\s*\\()`, 'm');
    if (fnPattern.test(modifiedCode) && !reexports.includes(name)) {
      modifiedCode = modifiedCode.replace(
        fnPattern,
        `let ${name} = function ${name}(`,
      );
    }

    // Handle non-exported `const Name =`
    const constPattern = new RegExp(`^(const\\s+${name}\\s*=)`, 'm');
    if (constPattern.test(modifiedCode) && !reexports.includes(name)) {
      modifiedCode = modifiedCode.replace(constPattern, `let ${name} =`);
    }
  }

  // Build the full HMR block
  const hmrBlock = `
import { _registerComponent, _hotReplace } from '@mikata/runtime';

${registrations}

${reexports.length > 0 ? `export { ${reexports.join(', ')} };` : ''}

if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (!mod) return;
${acceptBody}
  });
}
`;

  return modifiedCode + '\n' + hmrBlock;
}

export { mikataJSXPlugin } from './transform';
