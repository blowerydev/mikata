import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { getFunctionName, isComponentLikeFunction, isFunctionNode } from '../utils';

/**
 * Component setup must be synchronous. Once you `await`, the reactive scope
 * pushed by `_createComponent` has already popped and subsequent `provide`,
 * `inject`, `onCleanup`, etc. calls will see a null current scope.
 */
export const noAsyncComponent: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow async component functions. Setup must be synchronous - after `await` the reactive scope is gone.',
      recommended: true,
    },
    schema: [],
    messages: {
      async:
        'Component `{{name}}` is declared async. Setup must be synchronous - after the first `await`, the reactive scope is gone and `provide`/`inject`/`onCleanup` will fail. Move async work into `effect(async () => ...)` or a handler.',
    },
  },

  create(context) {
    function check(node: Node) {
      if (!isFunctionNode(node)) return;
      if (!node.async) return;
      const name = getFunctionName(node);
      if (!isComponentLikeFunction(node, name)) return;
      context.report({
        node,
        messageId: 'async',
        data: { name: name ?? 'default' },
      });
    }
    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};
