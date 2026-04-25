import type { Rule } from 'eslint';
import type { Node, Pattern, VariableDeclarator } from 'estree';
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
    const setterScopes: Array<Map<string, boolean>> = [];
    // Stack aligns with entered functions: true if THIS function is the
    // immediate callback to computed(...).
    const inComputedStack: boolean[] = [];

    function enterScope(): void {
      setterScopes.push(new Map());
    }

    function exitScope(): void {
      setterScopes.pop();
    }

    function currentScope(): Map<string, boolean> {
      return setterScopes[setterScopes.length - 1];
    }

    function declare(name: string, isSetter: boolean): void {
      currentScope().set(name, isSetter);
    }

    function declarePattern(pattern: Pattern, isSetter: boolean): void {
      if (pattern.type === 'Identifier') {
        declare(pattern.name, isSetter);
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
        declarePattern(pattern.left, isSetter);
      } else if (pattern.type === 'RestElement') {
        declarePattern(pattern.argument, isSetter);
      }
    }

    function isSetter(name: string): boolean {
      for (let i = setterScopes.length - 1; i >= 0; i--) {
        const value = setterScopes[i].get(name);
        if (value !== undefined) return value;
      }
      return false;
    }

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
      enterScope();
      for (const param of node.params) declarePattern(param, false);
      inComputedStack.push(isComputedCallback(node));
    }
    function exitFunction(): void {
      inComputedStack.pop();
      exitScope();
    }

    return {
      Program: enterScope,
      'Program:exit': exitScope,

      VariableDeclarator(node: VariableDeclarator) {
        const init = node.init;
        const isSignalCreator =
          !!init &&
          init.type === 'CallExpression' &&
          init.callee.type === 'Identifier' &&
          init.callee.name === 'signal';
        if (isSignalCreator && node.id.type === 'ArrayPattern') {
          const first = node.id.elements[0];
          if (first) declarePattern(first, false);
          const second = node.id.elements[1];
          if (second && second.type === 'Identifier') declare(second.name, true);
          for (const element of node.id.elements.slice(2)) {
            if (element) declarePattern(element, false);
          }
        } else {
          declarePattern(node.id, false);
        }
      },

      FunctionDeclaration: enter,
      FunctionExpression: enter,
      ArrowFunctionExpression: enter,
      'FunctionDeclaration:exit': exitFunction,
      'FunctionExpression:exit': exitFunction,
      'ArrowFunctionExpression:exit': exitFunction,

      CallExpression(node) {
        const top = inComputedStack[inComputedStack.length - 1];
        if (!top) return;
        const callee = node.callee;
        if (callee.type !== 'Identifier') return;
        if (!isSetter(callee.name)) return;
        context.report({
          node,
          messageId: 'write',
          data: { name: callee.name },
        });
      },
    };
  },
};
