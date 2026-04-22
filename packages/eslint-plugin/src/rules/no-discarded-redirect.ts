import type { Rule } from 'eslint';
import type {
  CallExpression,
  ExpressionStatement,
  ImportDeclaration,
  Node,
} from 'estree';

/**
 * `redirect(...)` from `@mikata/kit/action` returns a `Response` — the
 * adapter turns that Response into an HTTP 302. Discarding the return value
 * means the action falls through and the redirect never happens.
 *
 * ```tsx
 * export async function action({ cookies }: ActionContext) {
 *   // BUG: return-less redirect, action continues and no 302 is sent
 *   redirect('/login');
 *
 *   // OK:
 *   return redirect('/login');
 *   // or throw redirect('/login');
 * }
 * ```
 *
 * Scope: flags `redirect(...)` calls when the identifier was imported from
 * `@mikata/kit/action` (or `@mikata/kit`) and the call is the whole
 * ExpressionStatement. User-defined `redirect` helpers are ignored.
 */
export const noDiscardedRedirect: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require `redirect(...)` calls from @mikata/kit to be returned or thrown.',
      recommended: true,
    },
    schema: [],
    messages: {
      discarded:
        '`redirect()` returns a Response — you must `return` (or `throw`) it so the adapter can emit the HTTP redirect.',
    },
  },

  create(context) {
    const kitRedirectLocalNames = new Set<string>();

    function collectFromImport(node: ImportDeclaration): void {
      const source = typeof node.source.value === 'string' ? node.source.value : '';
      if (source !== '@mikata/kit/action' && source !== '@mikata/kit') return;
      for (const spec of node.specifiers) {
        if (
          spec.type === 'ImportSpecifier' &&
          spec.imported.type === 'Identifier' &&
          spec.imported.name === 'redirect'
        ) {
          kitRedirectLocalNames.add(spec.local.name);
        }
      }
    }

    function isKitRedirectCall(call: CallExpression): boolean {
      const callee = call.callee;
      return (
        callee.type === 'Identifier' && kitRedirectLocalNames.has(callee.name)
      );
    }

    return {
      ImportDeclaration: collectFromImport,

      ExpressionStatement(node: ExpressionStatement) {
        const expr = node.expression;
        if (expr.type !== 'CallExpression') return;
        if (!isKitRedirectCall(expr)) return;
        context.report({ node: node as Node, messageId: 'discarded' });
      },
    };
  },
};
