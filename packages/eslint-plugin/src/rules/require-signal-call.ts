import type { Rule } from 'eslint';
import type { Node, VariableDeclarator } from 'estree';

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
    const signalNames = new Set<string>();

    function recordSignal(name: string): void {
      signalNames.add(name);
    }

    function report(node: Node, name: string): void {
      context.report({ node, messageId: 'uncalled', data: { name } });
    }

    return {
      VariableDeclarator(node: VariableDeclarator) {
        const init = node.init;
        if (!init || init.type !== 'CallExpression') return;
        const callee = init.callee;
        if (callee.type !== 'Identifier') return;
        if (!SIGNAL_CREATORS.has(callee.name)) return;

        if (node.id.type === 'Identifier') {
          // const x = computed(...) / createDerivedSignal(...)
          recordSignal(node.id.name);
        } else if (node.id.type === 'ArrayPattern') {
          // const [x, setX] = signal(...)
          const first = node.id.elements[0];
          if (first && first.type === 'Identifier') recordSignal(first.name);
        }
      },

      // JSX children: <div>{count}</div>
      // JSX attributes: <input value={count} />
      // Skip ref / event handler slots where passing a function is correct.
      JSXExpressionContainer(node: Node & { expression: Node; parent?: Node }) {
        const expr = node.expression;
        if (!expr || expr.type !== 'Identifier') return;
        const name = (expr as { name: string }).name;
        if (!signalNames.has(name)) return;

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
          if (expr.type === 'Identifier' && signalNames.has(expr.name)) {
            report(expr, expr.name);
          }
        }
      },
    };
  },
};
