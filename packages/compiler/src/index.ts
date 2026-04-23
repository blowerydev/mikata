/**
 * @mikata/compiler - Vite plugin for Mikata JSX transform.
 *
 * Transforms JSX in .tsx/.jsx files into direct DOM operations
 * using @mikata/runtime helpers. No virtual DOM.
 */

import type { Plugin } from 'vite';
import { transformSync } from '@babel/core';
import { parse } from '@babel/parser';
import type * as BabelTypes from '@babel/types';
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
 * A component is a top-level declaration whose name starts with an
 * uppercase letter and whose initializer is a function or arrow
 * function. We parse with `@babel/parser` rather than regex so we only
 * see real declarations - JSX-like syntax inside template literals
 * (e.g. code samples in a docs page) stays untouched.
 */
interface ComponentDecl {
  name: string;
  /** 'named' for `export { X }`, 'default' for `export default function X`, 'none' otherwise. */
  exportKind: 'none' | 'named' | 'default';
  /** Range in the source to rewrite so the binding becomes reassignable. */
  rewriteStart: number;
  rewriteEnd: number;
  /** Text that replaces the [rewriteStart, rewriteEnd) span. */
  rewriteWith: string;
}

function findComponents(code: string): ComponentDecl[] {
  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });
  } catch {
    return [];
  }

  const out: ComponentDecl[] = [];
  for (const stmt of ast.program.body) {
    let inner: BabelTypes.Statement | BabelTypes.Declaration | null | undefined = stmt;
    let exportKind: ComponentDecl['exportKind'] = 'none';
    const stmtStart = stmt.start ?? 0;
    if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration) {
      inner = stmt.declaration;
      exportKind = 'named';
    } else if (stmt.type === 'ExportDefaultDeclaration') {
      // Only `export default function Name() {}` binds a local
      // identifier we can rewrite. Anonymous default exports and
      // `export default someIdentifier` are outside scope.
      if (
        stmt.declaration.type === 'FunctionDeclaration' &&
        stmt.declaration.id &&
        /^[A-Z]/.test(stmt.declaration.id.name)
      ) {
        inner = stmt.declaration;
        exportKind = 'default';
      } else {
        continue;
      }
    }
    if (!inner) continue;

    if (
      inner.type === 'FunctionDeclaration' &&
      inner.id &&
      /^[A-Z]/.test(inner.id.name)
    ) {
      // Rewrite `function Foo` (or `export [default] function Foo`) to
      // `let Foo = function Foo` so the binding is mutable for hot
      // replacement. Span: from start of the statement (past any
      // `export` / `export default` prefix) through the `function`
      // keyword of the inner declaration.
      const start = exportKind === 'none' ? (inner.start ?? 0) : stmtStart;
      const funcKwStart = inner.start ?? 0;
      const funcKwEnd = funcKwStart + 'function'.length;
      out.push({
        name: inner.id.name,
        exportKind,
        rewriteStart: start,
        rewriteEnd: funcKwEnd,
        rewriteWith: `let ${inner.id.name} = function`,
      });
      continue;
    }

    if (inner.type === 'VariableDeclaration') {
      // Only rewrite `const Foo = ...` forms with function/arrow RHS.
      // We rewrite the keyword from `const` to `let` (or strip
      // `export const` to `let`), leaving the rest of the declaration
      // intact.
      for (const decl of inner.declarations) {
        if (
          decl.id.type === 'Identifier' &&
          /^[A-Z]/.test(decl.id.name) &&
          decl.init &&
          (decl.init.type === 'ArrowFunctionExpression' ||
            decl.init.type === 'FunctionExpression')
        ) {
          if (inner.kind !== 'const' && inner.kind !== 'let' && inner.kind !== 'var') continue;
          // Only rewrite single-declarator statements; multi-declarator
          // `const A = ..., B = ...` isn't idiomatic here and the
          // keyword swap would wrongly apply to all names. Skip with
          // no loss - HMR still runs, just no hot-replace for this
          // exact shape.
          if (inner.declarations.length !== 1) break;
          const keywordStart = exportKind === 'none' ? (inner.start ?? 0) : stmtStart;
          const keywordEnd =
            (inner.start ?? 0) + (inner.kind === 'var' ? 3 : inner.kind.length);
          out.push({
            name: decl.id.name,
            exportKind,
            rewriteStart: keywordStart,
            rewriteEnd: keywordEnd,
            rewriteWith: 'let',
          });
        }
      }
    }
  }

  // Dedupe by name (order preserved). A file shouldn't declare the
  // same top-level binding twice, but guard anyway so the emitted
  // HMR block doesn't accept the same id twice.
  const seen = new Set<string>();
  return out.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
}

function injectHMR(code: string, filePath: string): string {
  const components = findComponents(code);
  if (components.length === 0) return code;

  // Apply rewrites back-to-front so earlier offsets stay valid.
  let modifiedCode = code;
  const sortedDescending = [...components].sort(
    (a, b) => b.rewriteStart - a.rewriteStart,
  );
  for (const c of sortedDescending) {
    modifiedCode =
      modifiedCode.slice(0, c.rewriteStart) +
      c.rewriteWith +
      modifiedCode.slice(c.rewriteEnd);
  }

  const registrations = components
    .map((c) => {
      const hmrId = `${filePath}::${c.name}`;
      return `${c.name} = _registerComponent("${hmrId}", ${c.name});`;
    })
    .join('\n');

  const acceptBody = components
    .map((c) => {
      const hmrId = `${filePath}::${c.name}`;
      return `  if (mod.${c.name}) _hotReplace("${hmrId}", mod.${c.name});`;
    })
    .join('\n');

  const reexports = components
    .filter((c) => c.exportKind === 'named')
    .map((c) => c.name);
  const defaultExport = components.find((c) => c.exportKind === 'default');

  const hmrBlock = `
import { _registerComponent, _hotReplace } from '@mikata/runtime';

${registrations}

${reexports.length > 0 ? `export { ${reexports.join(', ')} };` : ''}
${defaultExport ? `export default ${defaultExport.name};` : ''}

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
