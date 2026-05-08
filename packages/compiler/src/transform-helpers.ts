import type { types as BabelTypes, NodePath } from '@babel/core';
import {
  PUBLIC_RUNTIME_MODULES,
  STATIC_CALLBACK_CALLEES,
  type Binding,
  type Scope,
} from './transform-types';

export function createTransformHelpers(t: typeof BabelTypes) {
  function isStaticCallbackParam(binding: Binding | undefined): boolean {
    if (!binding || binding.kind !== 'param') return false;
    let p = binding.path as NodePath | null;
    while (p && !t.isArrowFunctionExpression(p.node) && !t.isFunctionExpression(p.node)) {
      p = p.parentPath;
    }
    if (!p) return false;
    const fn = p;
    const call = fn.parentPath;
    if (!call || !t.isCallExpression(call.node)) return false;
    if (call.node.callee === fn.node) return false;
    const callee = call.node.callee;
    if (!t.isIdentifier(callee)) return false;
    return STATIC_CALLBACK_CALLEES.has(callee.name);
  }

  function isImportedRuntimeHelper(scope: Scope | undefined, name: string): boolean {
    const binding = scope?.getBinding(name);
    if (!binding) return false;
    const parent = binding.path.parentPath?.node;
    if (!t.isImportDeclaration(parent)) return false;
    return PUBLIC_RUNTIME_MODULES.has(parent.source.value);
  }

  function isStaticJSXBranch(node: BabelTypes.Node): boolean {
    if (t.isJSXFragment(node)) {
      return node.children.every((child) => {
        if (t.isJSXText(child)) return true;
        if (t.isJSXExpressionContainer(child)) return t.isJSXEmptyExpression(child.expression);
        if (t.isJSXElement(child) || t.isJSXFragment(child)) return isStaticJSXBranch(child);
        return false;
      });
    }

    if (!t.isJSXElement(node)) return false;
    if (isComponent(node.openingElement.name)) return false;

    for (const attr of node.openingElement.attributes) {
      if (t.isJSXSpreadAttribute(attr)) return false;
      const name = attr.name;
      if (!t.isJSXIdentifier(name)) return false;
      if (name.name === 'ref' || /^on[A-Z]/.test(name.name)) return false;
      const value = attr.value;
      if (!value || t.isStringLiteral(value)) continue;
      if (
        t.isJSXExpressionContainer(value) &&
        (t.isStringLiteral(value.expression) ||
          t.isNumericLiteral(value.expression) ||
          t.isBooleanLiteral(value.expression))
      ) {
        continue;
      }
      return false;
    }

    return node.children.every((child) => {
      if (t.isJSXText(child)) return true;
      if (t.isJSXExpressionContainer(child)) return t.isJSXEmptyExpression(child.expression);
      if (t.isJSXElement(child) || t.isJSXFragment(child)) return isStaticJSXBranch(child);
      return false;
    });
  }

  function branchReturnsStaticJSX(arg: BabelTypes.CallExpression['arguments'][number] | undefined): boolean {
    if (!arg || t.isSpreadElement(arg)) return false;
    if (!t.isArrowFunctionExpression(arg) && !t.isFunctionExpression(arg)) return false;
    if (t.isJSXElement(arg.body) || t.isJSXFragment(arg.body)) {
      return isStaticJSXBranch(arg.body);
    }
    if (!t.isBlockStatement(arg.body)) return false;
    const returns = arg.body.body.filter((stmt): stmt is BabelTypes.ReturnStatement => t.isReturnStatement(stmt));
    return returns.length === 1 && !!returns[0].argument && isStaticJSXBranch(returns[0].argument);
  }

  function canAutoStaticShow(node: BabelTypes.CallExpression, scope?: Scope): boolean {
    if (!t.isIdentifier(node.callee, { name: 'show' })) return false;
    if (!isImportedRuntimeHelper(scope, 'show')) return false;
    if (node.arguments.length < 2 || node.arguments.length > 3) return false;
    if (!branchReturnsStaticJSX(node.arguments[1])) return false;
    return node.arguments.length === 2 || branchReturnsStaticJSX(node.arguments[2]);
  }

  function rootIdentifier(node: BabelTypes.Expression): BabelTypes.Identifier | null {
    let current: BabelTypes.Expression = node;
    while (t.isMemberExpression(current)) {
      if (current.computed) return null;
      current = current.object as BabelTypes.Expression;
    }
    return t.isIdentifier(current) ? current : null;
  }

  function isPotentiallyReactive(
    node: BabelTypes.Expression,
    scope?: Scope,
  ): boolean {
    if ((node as { type: string }).type === 'ParenthesizedExpression') {
      return isPotentiallyReactive((node as unknown as { expression: BabelTypes.Expression }).expression, scope);
    }
    if (t.isTSAsExpression(node) || t.isTSTypeAssertion(node) || t.isTSNonNullExpression(node)) {
      return isPotentiallyReactive(node.expression, scope);
    }
    if (t.isCallExpression(node)) return true;
    if (t.isMemberExpression(node)) {
      if (scope) {
        const root = rootIdentifier(node);
        if (root) {
          const binding = scope.getBinding(root.name);
          if (isStaticCallbackParam(binding)) return false;
        }
      }
      return true;
    }
    if (t.isConditionalExpression(node)) {
      return (
        isPotentiallyReactive(node.test, scope) ||
        isPotentiallyReactive(node.consequent, scope) ||
        isPotentiallyReactive(node.alternate, scope)
      );
    }
    if (t.isBinaryExpression(node)) {
      return (
        isPotentiallyReactive(node.left as BabelTypes.Expression, scope) ||
        isPotentiallyReactive(node.right as BabelTypes.Expression, scope)
      );
    }
    if (t.isTemplateLiteral(node)) {
      return node.expressions.some((e) => isPotentiallyReactive(e as BabelTypes.Expression, scope));
    }
    if (t.isLogicalExpression(node)) {
      return isPotentiallyReactive(node.left, scope) || isPotentiallyReactive(node.right, scope);
    }
    if (t.isUnaryExpression(node)) {
      return isPotentiallyReactive(node.argument as BabelTypes.Expression, scope);
    }
    if (t.isArrayExpression(node)) {
      return node.elements.some((element) => {
        if (!element) return false;
        if (t.isSpreadElement(element)) {
          return isPotentiallyReactive(element.argument as BabelTypes.Expression, scope);
        }
        return isPotentiallyReactive(element as BabelTypes.Expression, scope);
      });
    }
    if (t.isObjectExpression(node)) {
      return node.properties.some((prop) => {
        if (t.isSpreadElement(prop)) {
          return isPotentiallyReactive(prop.argument as BabelTypes.Expression, scope);
        }
        if (t.isObjectProperty(prop)) {
          const keyReactive =
            prop.computed && t.isExpression(prop.key)
              ? isPotentiallyReactive(prop.key, scope)
              : false;
          return keyReactive || isPotentiallyReactive(prop.value as BabelTypes.Expression, scope);
        }
        return false;
      });
    }
    if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) return false;
    if (t.isLiteral(node)) return false;
    return false;
  }

  function isComponent(
    name: BabelTypes.JSXIdentifier | BabelTypes.JSXMemberExpression | BabelTypes.JSXNamespacedName,
  ): boolean {
    if (t.isJSXIdentifier(name)) return /^[A-Z]/.test(name.name);
    if (t.isJSXMemberExpression(name)) return true;
    return false;
  }

  function jsxNameToExpression(
    name: BabelTypes.JSXIdentifier | BabelTypes.JSXMemberExpression | BabelTypes.JSXNamespacedName,
  ): BabelTypes.Expression {
    if (t.isJSXIdentifier(name)) return t.identifier(name.name);
    if (t.isJSXMemberExpression(name)) {
      return t.memberExpression(
        jsxNameToExpression(name.object) as BabelTypes.Expression,
        t.identifier(name.property.name),
      );
    }
    throw new Error('Namespaced JSX names are not supported');
  }

  function getAttrValue(
    value: BabelTypes.JSXAttribute['value'],
  ): BabelTypes.Expression {
    if (!value) return t.booleanLiteral(true);
    if (t.isStringLiteral(value)) return value;
    if (t.isJSXExpressionContainer(value)) {
      if (t.isJSXEmptyExpression(value.expression)) {
        return t.identifier('undefined');
      }
      return value.expression;
    }
    if (t.isJSXElement(value) || t.isJSXFragment(value)) {
      return value as unknown as BabelTypes.Expression;
    }
    return t.identifier('undefined');
  }

  function isEventProp(name: string): boolean {
    return /^on[A-Z]/.test(name);
  }

  function eventName(propName: string): string {
    return propName.slice(2).toLowerCase();
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function cleanJSXText(text: string): string {
    const lines = text.split(/\r\n|\n|\r/);
    let result = '';
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const isFirst = i === 0;
      const isLast = i === lines.length - 1;
      if (!isFirst) line = line.replace(/^[ \t]+/, '');
      if (!isLast) line = line.replace(/[ \t]+$/, '');
      if (line) {
        if (result && !isFirst) result += ' ';
        result += line;
      }
    }
    return result;
  }

  return {
    canAutoStaticShow,
    cleanJSXText,
    escapeAttr,
    escapeHtml,
    eventName,
    getAttrValue,
    isComponent,
    isEventProp,
    isPotentiallyReactive,
    jsxNameToExpression,
  };
}
