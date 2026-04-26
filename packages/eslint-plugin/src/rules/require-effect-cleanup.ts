import type { Rule } from 'eslint';
import type { Node, CallExpression, ReturnStatement } from 'estree';
import {
  getCalleeName,
  getFunctionName,
  isComponentLikeFunction,
  isFunctionNode,
} from '../utils';

const EFFECT_WRAPPERS = new Set(['effect', 'renderEffect', 'onMount']);
const SETUP_CALLBACK_WRAPPERS = new Set(['adoptElement']);

const SUBSCRIPTION_METHODS = new Set(['addEventListener', 'on']);
const SUBSCRIPTION_FUNCTIONS = new Set(['setInterval', 'setTimeout']);

/**
 * Flags subscriptions (addEventListener, .on(...), setInterval, setTimeout)
 * registered without a matching teardown. Two contexts:
 *
 * 1. Inside `effect`/`renderEffect`/`onMount` callbacks — cleanup can be
 *    either a returned function OR an `onCleanup(...)` call.
 * 2. Inside a component setup body (PascalCase function) — returning the
 *    JSX tree is NOT cleanup, so only `onCleanup(...)` counts.
 *
 * Heuristic only: we trust call-site names, don't track variable aliases.
 * False positive path: passing a stored handle out via side effect. In that
 * case either call `onCleanup` near the subscription or silence the rule.
 */
export const requireEffectCleanup: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require cleanup for subscriptions (addEventListener, .on, setInterval, setTimeout) inside effect/renderEffect/onMount callbacks and component setup bodies.',
      recommended: true,
    },
    schema: [],
    messages: {
      missingCleanup:
        'Subscription `{{name}}` inside `{{wrapper}}(...)` has no teardown. ' +
        'Return a cleanup function or call `onCleanup(...)` so it unsubscribes when the scope disposes.',
      missingComponentCleanup:
        'Subscription `{{name}}` in component `{{name2}}` has no teardown. ' +
        'Call `onCleanup(() => /* remove */)` so it unsubscribes when the component unmounts.',
    },
  },

  create(context) {
    function collectSubs(body: Node): {
      subs: { node: Node; name: string }[];
      hasCleanupReturn: boolean;
      hasOnCleanup: boolean;
    } {
      const subs: { node: Node; name: string }[] = [];
      let hasCleanupReturn = false;
      let hasOnCleanup = false;

      // Walk the body without crossing nested function boundaries - a
      // subscription inside an inner callback is that callback's problem.
      function visit(n: Node | null | undefined): void {
        if (!n) return;
        if (isFunctionNode(n as Node)) return;

        if (n.type === 'CallExpression') {
          const call = n as CallExpression;
          const callee = call.callee;
          if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
            if (SUBSCRIPTION_METHODS.has(callee.property.name)) {
              subs.push({ node: call, name: callee.property.name });
            }
          } else if (callee.type === 'Identifier') {
            if (SUBSCRIPTION_FUNCTIONS.has(callee.name)) {
              subs.push({ node: call, name: callee.name });
            }
            if (callee.name === 'onCleanup') {
              hasOnCleanup = true;
            }
          }
        }

        if (n.type === 'ReturnStatement') {
          const ret = n as ReturnStatement;
          if (ret.argument && isFunctionNode(ret.argument)) hasCleanupReturn = true;
        }

        for (const key of Object.keys(n) as Array<keyof typeof n>) {
          if (key === 'parent' || key === 'loc' || key === 'range') continue;
          const child = (n as unknown as Record<string, unknown>)[key as string];
          if (!child) continue;
          if (Array.isArray(child)) {
            for (const item of child) {
              if (item && typeof item === 'object' && 'type' in item) {
                visit(item as Node);
              }
            }
          } else if (typeof child === 'object' && 'type' in (child as object)) {
            visit(child as Node);
          }
        }
      }

      visit(body);
      return { subs, hasCleanupReturn, hasOnCleanup };
    }

    function checkComponent(node: Node): void {
      if (!isFunctionNode(node)) return;
      const name = getFunctionName(node);
      if (!isComponentLikeFunction(node, name)) return;
      // Don't re-flag effect callback bodies that happen to be named PascalCase.
      if (!node.body || node.body.type !== 'BlockStatement') return;

      const { subs, hasOnCleanup } = collectSubs(node.body);
      if (subs.length === 0) return;
      // For components, a return is the JSX tree — not a cleanup. Only
      // `onCleanup(...)` counts.
      if (hasOnCleanup) return;

      for (const sub of subs) {
        context.report({
          node: sub.node,
          messageId: 'missingComponentCleanup',
          data: { name: sub.name, name2: name ?? 'default' },
        });
      }
    }

    return {
      CallExpression(node) {
        const wrapperName = getCalleeName(node);
        if (!wrapperName) return;

        if (SETUP_CALLBACK_WRAPPERS.has(wrapperName)) {
          const callback = node.arguments[1];
          if (!callback || !isFunctionNode(callback as unknown as Node)) return;

          const fn = callback as unknown as { body: Node };
          if (!fn.body || fn.body.type !== 'BlockStatement') return;

          const { subs, hasOnCleanup } = collectSubs(fn.body);

          if (subs.length === 0 || hasOnCleanup) return;

          for (const sub of subs) {
            context.report({
              node: sub.node,
              messageId: 'missingComponentCleanup',
              data: { name: sub.name, name2: wrapperName },
            });
          }
          return;
        }

        if (!EFFECT_WRAPPERS.has(wrapperName)) return;

        const callback = node.arguments[0];
        if (!callback || !isFunctionNode(callback as unknown as Node)) return;

        const fn = callback as unknown as { body: Node };

        // Only analyze block-body functions. An arrow with expression body
        // has no statements to subscribe from.
        if (!fn.body || fn.body.type !== 'BlockStatement') return;

        const { subs, hasCleanupReturn, hasOnCleanup } = collectSubs(fn.body);

        if (subs.length === 0) return;
        if (hasCleanupReturn || hasOnCleanup) return;

        for (const sub of subs) {
          context.report({
            node: sub.node,
            messageId: 'missingCleanup',
            data: { name: sub.name, wrapper: wrapperName },
          });
        }
      },
      FunctionDeclaration: checkComponent,
      FunctionExpression: checkComponent,
      ArrowFunctionExpression: checkComponent,
    };
  },
};
