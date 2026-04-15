import type { Rule } from 'eslint';
import type { Node, VariableDeclarator, AssignmentExpression, UpdateExpression } from 'estree';

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
    const signalNames = new Set<string>();

    function capitalize(name: string): string {
      if (!name) return name;
      return name[0].toUpperCase() + name.slice(1);
    }

    return {
      VariableDeclarator(node: VariableDeclarator) {
        const init = node.init;
        if (!init || init.type !== 'CallExpression') return;
        const callee = init.callee;
        if (callee.type !== 'Identifier') return;
        if (!SIGNAL_CREATORS.has(callee.name)) return;

        if (node.id.type === 'Identifier') {
          signalNames.add(node.id.name);
        } else if (node.id.type === 'ArrayPattern') {
          const first = node.id.elements[0];
          if (first && first.type === 'Identifier') signalNames.add(first.name);
        }
      },

      AssignmentExpression(node: AssignmentExpression) {
        const left = node.left;
        if (left.type !== 'Identifier') return;
        if (!signalNames.has(left.name)) return;
        context.report({
          node: left as unknown as Node,
          messageId: 'assignment',
          data: { name: left.name, capName: capitalize(left.name) },
        });
      },

      UpdateExpression(node: UpdateExpression) {
        const arg = node.argument;
        if (arg.type !== 'Identifier') return;
        if (!signalNames.has(arg.name)) return;
        context.report({
          node: arg as unknown as Node,
          messageId: 'update',
          data: { name: arg.name, op: node.operator },
        });
      },
    };
  },
};
