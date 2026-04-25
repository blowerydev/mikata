import type { Rule } from 'eslint';
import type {
  AssignmentExpression,
  Node,
  Pattern,
  UpdateExpression,
  VariableDeclarator,
} from 'estree';

/**
 * Factories whose bindings represent a signal getter. Mirrors
 * `require-signal-call`'s list so the two rules stay in sync.
 */
const SIGNAL_CREATORS = new Set([
  'signal',
  'computed',
  'derived',
  'createDerivedSignal',
  'createMemo',
]);

/**
 * Flags reassigning a signal getter as if it were a plain variable.
 *
 * ```ts
 * const [count, setCount] = signal(0);
 * count = 5;   // ❌ clobbers the getter; use setCount(5)
 * count++;     // ❌ same
 *
 * // The destructured case is also caught by TS/const, but this rule covers
 * // `let`-bound signals and non-destructured forms.
 * let status = computed(() => 'idle');
 * status = 'ready';  // ❌ replaces the getter with a string
 * ```
 *
 * Scope: syntactic only — tracks identifiers bound to `signal()`, `computed()`,
 * `createDerivedSignal()`, etc. within the same file. Flags
 * `AssignmentExpression` and `UpdateExpression` against those identifiers.
 * Does not follow aliases or cross-module passing.
 */
export const noSignalAssignment: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Signal getters must not be reassigned — use the setter (for signal()) or create a new computed.',
      recommended: true,
    },
    schema: [],
    messages: {
      assignment:
        'Cannot reassign signal getter `{{name}}`. Use its setter (e.g. `set{{capName}}(...)`) or wrap the new value in a computed.',
      update:
        'Cannot apply `{{op}}` to signal getter `{{name}}`. Read with `{{name}}()` and update via its setter.',
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

    function capitalize(name: string): string {
      if (!name) return name;
      return name[0].toUpperCase() + name.slice(1);
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
          declare(node.id.name, true);
        } else if (isSignalCreator && node.id.type === 'ArrayPattern') {
          const first = node.id.elements[0];
          if (first && first.type === 'Identifier') declare(first.name, true);
          for (const element of node.id.elements.slice(1)) {
            if (element) declarePattern(element, false);
          }
        } else {
          declarePattern(node.id, false);
        }
      },

      AssignmentExpression(node: AssignmentExpression) {
        const left = node.left;
        if (left.type !== 'Identifier') return;
        if (!isSignal(left.name)) return;
        context.report({
          node: left as unknown as Node,
          messageId: 'assignment',
          data: { name: left.name, capName: capitalize(left.name) },
        });
      },

      UpdateExpression(node: UpdateExpression) {
        const arg = node.argument;
        if (arg.type !== 'Identifier') return;
        if (!isSignal(arg.name)) return;
        context.report({
          node: arg as unknown as Node,
          messageId: 'update',
          data: { name: arg.name, op: node.operator },
        });
      },
    };
  },
};
