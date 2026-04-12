import type { Rule } from 'eslint';
import type { CallExpression, Node } from 'estree';
import {
  ancestors,
  getCalleeName,
  getFunctionName,
  isFunctionNode,
  isHookName,
  isPascalCase,
} from '../utils';

/**
 * Names of functions that require an active reactive scope at call time.
 * These push/pop onto the current-scope stack via getCurrentScope().
 */
const SCOPE_REQUIRED = new Set([
  'provide',
  'inject',
  'onCleanup',
  'onMount',
  'useRouter',
  'useParams',
  'useSearchParams',
  'useTheme',
  'useGuard',
  'useMatch',
  'useI18n',
  'provideI18n',
  'provideRouter',
  'provideComponentDefaults',
  'useComponentDefaults',
  'useUILabels',
]);

/**
 * Wrappers that DO establish a scope for their callback — calls inside these
 * are safe even from non-component helpers.
 */
const SCOPE_ESTABLISHING = new Set(['_createComponent', 'createComponent', 'createScope', 'render']);

/**
 * Wrappers that explicitly DO NOT establish a scope and break the current one.
 * A scope-required call inside these is a bug.
 */
const SCOPE_BREAKING = new Set([
  'effect',
  'renderEffect',
  'setTimeout',
  'setInterval',
  'queueMicrotask',
  'requestAnimationFrame',
  'requestIdleCallback',
  'then',
  'catch',
  'finally',
]);

export const rulesOfSetup: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce that scope-required calls (provide, inject, onCleanup, onMount, useX) only run during component setup.',
      recommended: true,
    },
    schema: [],
    messages: {
      insideEffect:
        "`{{name}}` must run during component setup, but it's inside `{{wrapper}}(...)`. " +
        'Callbacks to effect/setTimeout/Promise.then run after setup has returned and have no scope. ' +
        'Move the call to the top level of the component.',
      asyncComponent:
        "`{{name}}` is inside an async function. Component setup must be synchronous — after the first `await`, the reactive scope is gone.",
      atTopLevel:
        "`{{name}}` must run during component setup, but it's at module top level. " +
        'Move it inside a component function or inside `createScope`/`render`.',
      insideHelper:
        "`{{name}}` is inside `{{helper}}()` which is not a component (PascalCase) or hook (useX). " +
        'Either rename it to follow one of those patterns, or call `{{name}}` directly from the component.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const name = getCalleeName(node);
        if (!name || !SCOPE_REQUIRED.has(name)) return;

        let innerHelperName: string | null = null;

        for (const anc of ancestors(node as unknown as Node, context)) {
          if (isFunctionNode(anc)) {
            if (anc.async) {
              context.report({
                node,
                messageId: 'asyncComponent',
                data: { name },
              });
              return;
            }
            const parentCall = (anc as Node & { parent?: Node }).parent;
            if (
              parentCall &&
              parentCall.type === 'CallExpression' &&
              parentCall.arguments.includes(anc as unknown as never)
            ) {
              const wrapperName = getCalleeName(parentCall as CallExpression);
              if (wrapperName && SCOPE_BREAKING.has(wrapperName)) {
                context.report({
                  node,
                  messageId: 'insideEffect',
                  data: { name, wrapper: wrapperName },
                });
                return;
              }
              if (wrapperName && SCOPE_ESTABLISHING.has(wrapperName)) {
                return;
              }
            }
            const fnName = getFunctionName(anc);
            if (isPascalCase(fnName) || isHookName(fnName)) {
              return;
            }
            if (innerHelperName === null) {
              innerHelperName = fnName ?? '<anonymous>';
            }
          }
          if (anc.type === 'Program') {
            if (innerHelperName) {
              context.report({
                node,
                messageId: 'insideHelper',
                data: { name, helper: innerHelperName },
              });
            } else {
              context.report({
                node,
                messageId: 'atTopLevel',
                data: { name },
              });
            }
            return;
          }
        }
      },
    };
  },
};
