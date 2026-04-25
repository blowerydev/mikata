import type { Rule } from 'eslint';
import type { Node, Pattern, VariableDeclarator } from 'estree';

/**
 * Factories that return a signal-like getter function. The rule tracks
 * identifiers bound to their results so it can recognize bare-identifier
 * uses that should be calls.
 */
const SIGNAL_CREATORS = new Set([
  'signal',
  'computed',
  'derived',
  'createDerivedSignal',
  'createMemo',
]);

/**
 * Catches the #1 migrant footgun: treating a signal like a plain variable.
 *
 * ```tsx
 * const [count, setCount] = signal(0);
 *
 * // WRONG - renders "function () { ... }" because `count` is the getter
 * <div>{count}</div>
 *
 * // WRONG - template coerces the function to a string
 * `Count: ${count}`
 *
 * // RIGHT
 * <div>{count()}</div>
 * ```
 *
 * Scope: flags bare signal identifiers only in JSX expression containers
 * (children + attributes, excluding `ref`/`on*` handler slots) and in
 * template-literal substitutions. Syntactic-only — tracks variables
 * declared from `signal()`, `computed()`, etc. within the same file.
 * Passing signals across module boundaries is not analyzed.
 */
export const requireSignalCall: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Signal getters must be called at read sites (count() not count).',
      recommended: true,
    },
    schema: [],
    messages: {
      uncalled:
        'Signal `{{name}}` is used without being called. Signals are functions - write `{{name}}()` to read the current value.',
    },
  },

  create(context) {
    const scopes: Array<Map<string, boolean>> = [];

    function enterScope(): void {
      scopes.push(new Map());
    }

    function exitScope(): void {
      scopes.pop();
    }

    function currentScope(): Map<string, boolean> {
      return scopes[scopes.length - 1];
    }

    function declare(name: string, isSignal: boolean): void {
      currentScope().set(name, isSignal);
    }

    function declarePattern(pattern: Pattern, isSignal: boolean): void {
      if (pattern.type === 'Identifier') {
        declare(pattern.name, isSignal);
      } else if (pattern.type === 'ArrayPattern') {
        for (const element of pattern.elements) {
          if (element) declarePattern(element, false);
        }
      } else if (pattern.type === 'ObjectPattern') {
        for (const prop of pattern.properties) {
          if (prop.type === 'Property') declarePattern(prop.value as Pattern, false);
          if (prop.type === 'RestElement') declarePattern(prop.argument, false);
        }
      } else if (pattern.type === 'AssignmentPattern') {
        declarePattern(pattern.left, isSignal);
      } else if (pattern.type === 'RestElement') {
        declarePattern(pattern.argument, isSignal);
      }
    }

    function isSignal(name: string): boolean {
      for (let i = scopes.length - 1; i >= 0; i--) {
        const value = scopes[i].get(name);
        if (value !== undefined) return value;
      }
      return false;
    }

    function report(node: Node, name: string): void {
      context.report({ node, messageId: 'uncalled', data: { name } });
    }

    return {
      Program: enterScope,
      'Program:exit': exitScope,

      FunctionDeclaration(node) {
        enterScope();
        for (const param of node.params) declarePattern(param, false);
      },
      'FunctionDeclaration:exit': exitScope,
      FunctionExpression(node) {
        enterScope();
        for (const param of node.params) declarePattern(param, false);
      },
      'FunctionExpression:exit': exitScope,
      ArrowFunctionExpression(node) {
        enterScope();
        for (const param of node.params) declarePattern(param, false);
      },
      'ArrowFunctionExpression:exit': exitScope,

      VariableDeclarator(node: VariableDeclarator) {
        const init = node.init;
        let isSignalCreator = false;
        if (init && init.type === 'CallExpression') {
          const callee = init.callee;
          isSignalCreator = callee.type === 'Identifier' && SIGNAL_CREATORS.has(callee.name);
        }

        if (isSignalCreator && node.id.type === 'Identifier') {
          // const x = computed(...) / createDerivedSignal(...)
          declare(node.id.name, true);
        } else if (isSignalCreator && node.id.type === 'ArrayPattern') {
          // const [x, setX] = signal(...)
          const first = node.id.elements[0];
          if (first && first.type === 'Identifier') declare(first.name, true);
          for (const element of node.id.elements.slice(1)) {
            if (element) declarePattern(element, false);
          }
        } else {
          declarePattern(node.id, false);
        }
      },

      // JSX children: <div>{count}</div>
      // JSX attributes: <input value={count} />
      // Skip ref / event handler slots where passing a function is correct.
      JSXExpressionContainer(node: Node & { expression: Node; parent?: Node }) {
        const expr = node.expression;
        if (!expr || expr.type !== 'Identifier') return;
        const name = (expr as { name: string }).name;
        if (!isSignal(name)) return;

        const parent = node.parent;
        if (parent && parent.type === ('JSXAttribute' as unknown as Node['type'])) {
          const attrName = (parent as unknown as { name: { name?: string } }).name?.name;
          if (typeof attrName === 'string') {
            if (attrName === 'ref') return;
            if (attrName.startsWith('on') && /^on[A-Z]/.test(attrName)) return;
          }
        }
        report(expr, name);
      },

      // `${count}` in template literals
      TemplateLiteral(node) {
        for (const expr of node.expressions) {
          if (expr.type === 'Identifier' && isSignal(expr.name)) {
            report(expr, expr.name);
          }
        }
      },
    };
  },
};
