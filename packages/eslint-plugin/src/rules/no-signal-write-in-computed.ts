import type { Rule } from 'eslint';
import type { Node, VariableDeclarator } from 'estree';
import { isFunctionNode } from '../utils';

/**
 * `computed(() => ...)` callbacks must be pure derivations. Writing to a
 * signal (via a `setX` setter returned from `signal()`) inside computed
 * creates a cycle-prone write-in-read that the runtime warns about at
 * runtime - this rule catches it statically.
 *
 * Heuristic: tracks setters introduced by `const [x, setX] = signal(...)`.
 * Flags calls to those setters when the *immediately enclosing* function
 * is the computed callback. Setters called inside nested callbacks
 * (setTimeout, event handlers) run AFTER computed returns, so they're
 * fine and not flagged.
 */
export const noSignalWriteInComputed: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow signal setter calls inside computed() callbacks. Computed must be pure.',
      recommended: true,
    },
    schema: [],
    messages: {
      write:
        'Setter `{{name}}` called inside `computed(...)`. Computed values must be pure derivations - move the write into an `effect()` or an event handler.',
    },
  },

  create(context) {
    const setters = new Set<string>();
    // Stack aligns with entered functions: true if THIS function is the
    // immediate callback to computed(...).
    const inComputedStack: boolean[] = [];

    function isComputedCallback(fn: Node): boolean {
      const parent = (fn as Node & { parent?: Node }).parent;
      if (!parent || parent.type !== 'CallExpression') return false;
      const call = parent;
      if (call.callee.type !== 'Identifier') return false;
      if (call.callee.name !== 'computed') return false;
      return call.arguments[0] === (fn as unknown as typeof call.arguments[0]);
    }

    function enter(node: Node): void {
      if (!isFunctionNode(node)) return;
      inComputedStack.push(isComputedCallback(node));
    }
    function exit(): void {
      inComputedStack.pop();
    }

    return {
      VariableDeclarator(node: VariableDeclarator) {
        const init = node.init;
        if (!init || init.type !== 'CallExpression') return;
        const callee = init.callee;
        if (callee.type !== 'Identifier' || callee.name !== 'signal') return;
        if (node.id.type !== 'ArrayPattern') return;
        const second = node.id.elements[1];
        if (second && second.type === 'Identifier') setters.add(second.name);
      },

      FunctionDeclaration: enter,
      FunctionExpression: enter,
      ArrowFunctionExpression: enter,
      'FunctionDeclaration:exit': exit,
      'FunctionExpression:exit': exit,
      'ArrowFunctionExpression:exit': exit,

      CallExpression(node) {
        const top = inComputedStack[inComputedStack.length - 1];
        if (!top) return;
        const callee = node.callee;
        if (callee.type !== 'Identifier') return;
        if (!setters.has(callee.name)) return;
        context.report({
          node,
          messageId: 'write',
          data: { name: callee.name },
        });
      },
    };
  },
};
