import type { Rule } from 'eslint';
import type {
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  Node,
} from 'estree';

/**
 * Kit classifies a route file as an API route when it has **no default
 * export** and at least one HTTP-verb named export. Exporting both a default
 * and a verb handler silently drops the verb — the file renders as a page and
 * requests to it with `POST`/`PUT`/etc. return a generic 405 instead of
 * hitting the handler.
 *
 * ```ts
 * // routes/api/users.ts
 * export default function Users() { ... }  // <- makes this a PAGE route
 * export async function GET() { ... }       // <- silently ignored
 * ```
 *
 * This rule flags either half of that combo so the mistake surfaces at lint
 * time instead of at request time.
 */
const HTTP_VERBS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export const noApiRouteDefaultExport: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow mixing a default export with HTTP-verb exports in a route file.',
      recommended: true,
    },
    schema: [],
    messages: {
      mixed:
        '`{{verb}}` export is ignored because this module also has a default export. Kit only treats a file as an API route when there is no default export. Remove the default export or move the handler to its own file.',
    },
  },

  create(context) {
    let defaultExport: ExportDefaultDeclaration | null = null;
    const verbExports: Array<{ name: string; node: Node }> = [];

    function collectNamedExport(node: ExportNamedDeclaration): void {
      if (node.declaration) {
        const decl = node.declaration;
        if (decl.type === 'FunctionDeclaration' && decl.id) {
          if (HTTP_VERBS.has(decl.id.name)) {
            verbExports.push({ name: decl.id.name, node: decl as Node });
          }
          return;
        }
        if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id.type === 'Identifier' && HTTP_VERBS.has(d.id.name)) {
              verbExports.push({ name: d.id.name, node: d as Node });
            }
          }
          return;
        }
      }
      for (const spec of node.specifiers) {
        if (spec.type !== 'ExportSpecifier') continue;
        const exported = spec.exported;
        const exportedName =
          exported.type === 'Identifier'
            ? exported.name
            : exported.type === 'Literal'
              ? String(exported.value)
              : '';
        if (HTTP_VERBS.has(exportedName)) {
          verbExports.push({ name: exportedName, node: spec as Node });
        }
      }
    }

    return {
      ExportDefaultDeclaration(node: ExportDefaultDeclaration) {
        defaultExport = node;
      },

      ExportNamedDeclaration: collectNamedExport,

      'Program:exit'() {
        if (!defaultExport || verbExports.length === 0) return;
        for (const { name, node } of verbExports) {
          context.report({ node, messageId: 'mixed', data: { verb: name } });
        }
      },
    };
  },
};
