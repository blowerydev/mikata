import type { Rule } from 'eslint';
import type { CallExpression } from 'estree';
import {
  ancestors,
  getFunctionName,
  isFunctionNode,
  isComponentLikeFunction,
  type FunctionNode,
} from '../utils';

const IMPERATIVE_DOM_METHODS = new Set(['createElement', 'createElementNS']);

/**
 * Flags `document.createElement(...)` (and `createElementNS`) calls that sit
 * at the top level of a component function body - the signal that a
 * component is building its root structure imperatively instead of through
 * `adoptElement()`.
 *
 * Imperative roots work for CSR but break SSR + hydration: the adoption
 * cursor has no way to reconcile a freshly-created element with the
 * matching SSR-rendered element, and the fresh element gets orphaned.
 *
 * The rule is intentionally narrow - it only flags calls whose *closest*
 * enclosing function is PascalCase-named. Calls inside nested helpers,
 * `renderEffect` / `effect` callbacks, event handlers, or `adoptElement`
 * setup callbacks are allowed because those run post-setup and typically
 * append to already-adopted parents.
 *
 * ```ts
 * // ❌ top-level createElement in a component
 * export function Widget() {
 *   const root = document.createElement('div');
 *   return root;
 * }
 *
 * // ✅ adoption
 * export function Widget() {
 *   return adoptElement('div', (root) => {
 *     // inner createElement for dynamic content is fine
 *     const span = document.createElement('span');
 *     root.appendChild(span);
 *   });
 * }
 * ```
 *
 * Apply via flat config scoping, e.g.:
 *
 * ```js
 * {
 *   files: ['packages/ui/src/components/**\/*.tsx'],
 *   rules: { '@mikata/no-imperative-dom-in-ui': 'error' },
 * }
 * ```
 */
export const noImperativeDomInUi: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow top-level `document.createElement` in component functions - use `adoptElement` so SSR/hydration can reconcile the root.',
      recommended: false,
    },
    schema: [],
    messages: {
      imperativeRoot:
        'Avoid `document.{{method}}` at the top level of component `{{name}}`. Wrap the root in `adoptElement()` so hydration can adopt the SSR-rendered node. Calls inside nested helpers or `adoptElement` callbacks are fine.',
    },
  },

  create(context) {
    return {
      CallExpression(node: CallExpression) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression') return;
        if (callee.object.type !== 'Identifier' || callee.object.name !== 'document') return;
        if (callee.property.type !== 'Identifier') return;
        if (!IMPERATIVE_DOM_METHODS.has(callee.property.name)) return;

        // Find the closest enclosing function. If it's a PascalCase-named
        // component, the createElement is at its top level - that's the
        // regression we want to flag. Anything deeper (nested helpers,
        // effect callbacks, adoptElement setups) finds a non-component
        // function first and slips through.
        let closestFn: FunctionNode | null = null;
        for (const anc of ancestors(node, context)) {
          if (isFunctionNode(anc)) {
            closestFn = anc;
            break;
          }
        }
        if (!closestFn) return;

        const name = getFunctionName(closestFn);
        // PascalCase-named OR anonymous default export. Without the
        // default-export branch, `export default () => { ... }` route
        // files - common in apps - silently skipped this rule.
        if (!isComponentLikeFunction(closestFn, name)) return;

        context.report({
          node,
          messageId: 'imperativeRoot',
          data: {
            method: callee.property.name,
            name: name ?? 'default',
          },
        });
      },
    };
  },
};
