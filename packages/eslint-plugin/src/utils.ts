import type { Rule } from 'eslint';
import type {
  Node,
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
} from 'estree';

export type FunctionNode =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression;

export function isFunctionNode(node: Node | null | undefined): node is FunctionNode {
  if (!node) return false;
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

/**
 * Get a best-effort name for a function node by looking at its own name,
 * its enclosing variable/property declaration, or its export.
 */
export function getFunctionName(node: FunctionNode): string | null {
  if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') && node.id) {
    return node.id.name;
  }
  const parent = (node as Node & { parent?: Node }).parent;
  if (!parent) return null;
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name;
  }
  if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
    return parent.left.name;
  }
  if (parent.type === 'Property' && parent.key.type === 'Identifier') {
    return parent.key.name;
  }
  if (parent.type === 'MethodDefinition' && parent.key.type === 'Identifier') {
    return parent.key.name;
  }
  if (parent.type === 'ExportDefaultDeclaration') {
    // Default export with no local name.
    return null;
  }
  return null;
}

export function isPascalCase(name: string | null): boolean {
  return !!name && /^[A-Z][A-Za-z0-9_$]*$/.test(name);
}

export function isHookName(name: string | null): boolean {
  return !!name && /^use[A-Z0-9_]/.test(name);
}

/**
 * Get the direct CallExpression ancestor whose argument is this function literal,
 * if any. Returns null if this function is not immediately a call argument.
 */
export function getCallThatReceivesFunction(
  fn: FunctionNode
): CallExpression | null {
  const parent = (fn as Node & { parent?: Node }).parent;
  if (!parent) return null;
  if (parent.type === 'CallExpression' && parent.arguments.includes(fn as unknown as never)) {
    return parent;
  }
  return null;
}

/**
 * Return the callee identifier name of a CallExpression:
 *   foo()               -> 'foo'
 *   obj.bar()           -> 'bar'
 *   promise.then(cb)    -> 'then'
 *   (expr)()            -> null
 */
export function getCalleeName(call: CallExpression): string | null {
  const callee = call.callee;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') {
    if (callee.property.type === 'Identifier') return callee.property.name;
  }
  return null;
}

/**
 * Walk up from a node, yielding each ancestor. Requires parent references -
 * ESLint sets these on SourceCode#getAncestors or directly via context.getAncestors().
 */
export function* ancestors(node: Node, context: Rule.RuleContext): Generator<Node> {
  // ESLint 8/9: prefer sourceCode.getAncestors(node) if available (flat-config),
  // else fall back to context.getAncestors() (works while ESLint is visiting this node).
  const sc = (context as unknown as { sourceCode?: { getAncestors?: (n: Node) => Node[] } }).sourceCode
    ?? (context.getSourceCode ? context.getSourceCode() : undefined);
  let anc: Node[];
  if (sc && typeof (sc as { getAncestors?: unknown }).getAncestors === 'function') {
    anc = (sc as { getAncestors: (n: Node) => Node[] }).getAncestors(node);
  } else {
    anc = (context as unknown as { getAncestors(): Node[] }).getAncestors();
  }
  // getAncestors returns oldest→closest; we want closest→oldest.
  for (let i = anc.length - 1; i >= 0; i--) yield anc[i] as Node;
}
