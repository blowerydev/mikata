import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { getFunctionName, isFunctionNode, isPascalCase } from '../utils';

/**
 * Props in Mikata are getter-backed objects: destructuring them in the parameter
 * list collapses each getter to its value at setup time, breaking reactivity.
 *
 * ```ts
 * // BAD - `label` is frozen at the first render.
 * function Button({ label, onClick }: Props) { return <button>{label}</button>; }
 *
 * // GOOD
 * function Button(props: Props) { return <button>{props.label}</button>; }
 * ```
 */
export const noDestructuredProps: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow destructuring the props parameter of a component - it breaks reactivity.',
      recommended: true,
    },
    schema: [],
    messages: {
      destructured:
        'Destructuring props in the parameter of component `{{name}}` breaks reactivity - each destructured name is frozen at setup. ' +
        'Use `props` directly; access fields as `props.foo`.',
    },
  },

  create(context) {
    function check(node: Node) {
      if (!isFunctionNode(node)) return;
      const name = getFunctionName(node);
      if (!isPascalCase(name)) return;
      const first = node.params[0];
      if (!first) return;
      if (first.type === 'ObjectPattern') {
        context.report({
          node: first,
          messageId: 'destructured',
          data: { name: name ?? '<anonymous>' },
        });
      } else if (
        first.type === 'AssignmentPattern' &&
        first.left.type === 'ObjectPattern'
      ) {
        context.report({
          node: first.left,
          messageId: 'destructured',
          data: { name: name ?? '<anonymous>' },
        });
      }
    }
    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};
