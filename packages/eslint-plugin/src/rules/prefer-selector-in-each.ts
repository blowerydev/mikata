import type { Rule } from 'eslint';
import type {
  ArrowFunctionExpression,
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  Node,
  Pattern,
  VariableDeclarator,
} from 'estree';
import {
  ancestors,
  getCalleeName,
  getCallThatReceivesFunction,
  isFunctionNode,
  type FunctionNode,
} from '../utils';

const SIGNAL_CREATORS = new Set([
  'signal',
  'computed',
  'derived',
  'createDerivedSignal',
  'createMemo',
]);

const REACTIVE_WRAPPERS = new Set(['effect', 'renderEffect', 'computed']);

type FunctionFrame = {
  eachItemNames: Set<string>;
};

/**
 * Flags row-wide selection checks such as `selectedId() === row.id` inside
 * `each(...)` render work. In a table/list this subscribes every rendered row
 * to the same selection signal, so changing selection re-runs all row effects.
 * `createSelector(selectedId)` gives each row a keyed bucket and only wakes the
 * old/new selected rows.
 */
export const preferSelectorInEach: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer createSelector() for signal equality checks against each() item keys.',
      recommended: true,
    },
    schema: [],
    messages: {
      preferSelector:
        'Signal `{{signal}}()` is compared with an `each()` item key inside render work. Use `createSelector({{signal}})` and call the selector with the item key so selection changes only update affected rows.',
    },
  },

  create(context) {
    const signalScopes: Array<Map<string, boolean>> = [];
    const functionStack: FunctionFrame[] = [];

    function enterScope(): void {
      signalScopes.push(new Map());
    }

    function exitScope(): void {
      signalScopes.pop();
    }

    function declare(name: string, isSignal: boolean): void {
      signalScopes[signalScopes.length - 1].set(name, isSignal);
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
      for (let i = signalScopes.length - 1; i >= 0; i--) {
        const value = signalScopes[i].get(name);
        if (value !== undefined) return value;
      }
      return false;
    }

    function isEachCallback(fn: FunctionNode): boolean {
      const call = getCallThatReceivesFunction(fn);
      if (!call) return false;
      if (getCalleeName(call) !== 'each') return false;
      return call.arguments[1] === fn as unknown as never;
    }

    function eachItemNamesFor(fn: FunctionNode): Set<string> {
      const names = new Set<string>();
      if (!isEachCallback(fn)) return names;
      const itemParam = fn.params[0];
      if (itemParam?.type === 'Identifier') names.add(itemParam.name);
      return names;
    }

    function enterFunction(
      node: FunctionDeclaration | FunctionExpression | ArrowFunctionExpression,
    ): void {
      enterScope();
      for (const param of node.params) declarePattern(param, false);
      functionStack.push({ eachItemNames: eachItemNamesFor(node) });
    }

    function exitFunction(): void {
      functionStack.pop();
      exitScope();
    }

    function currentEachItemNames(): Set<string> {
      const names = new Set<string>();
      for (const frame of functionStack) {
        for (const name of frame.eachItemNames) names.add(name);
      }
      return names;
    }

    function isSignalGetterCall(node: Node): string | null {
      if (node.type !== 'CallExpression') return null;
      if (node.arguments.length !== 0) return null;
      const callee = node.callee;
      if (callee.type !== 'Identifier') return null;
      return isSignal(callee.name) ? callee.name : null;
    }

    function containsAnyIdentifier(node: Node, names: Set<string>): boolean {
      if (node.type === 'Identifier') return names.has(node.name);
      if (isFunctionNode(node)) return false;

      for (const key of Object.keys(node) as Array<keyof Node>) {
        if (key === 'type' || key === 'loc' || key === 'range') continue;
        const value = node[key] as unknown;
        if (!value) continue;
        if (Array.isArray(value)) {
          for (const child of value) {
            if (child && typeof child === 'object' && 'type' in child) {
              if (containsAnyIdentifier(child as Node, names)) return true;
            }
          }
        } else if (typeof value === 'object' && 'type' in value) {
          if (containsAnyIdentifier(value as Node, names)) return true;
        }
      }
      return false;
    }

    function jsxAttributeName(attr: Node): string | null {
      if (attr.type !== ('JSXAttribute' as unknown as Node['type'])) return null;
      const name = (attr as unknown as { name?: { name?: string } }).name?.name;
      return typeof name === 'string' ? name : null;
    }

    function isEventOrRefAttribute(attrName: string | null): boolean {
      return attrName === 'ref' || !!attrName?.match(/^on[A-Z]/);
    }

    function isInsideTrackedRenderWork(node: Node): boolean {
      for (const ancestor of ancestors(node, context)) {
        if (ancestor.type === ('JSXExpressionContainer' as unknown as Node['type'])) {
          const parent = (ancestor as Node & { parent?: Node }).parent;
          const attrName = parent ? jsxAttributeName(parent) : null;
          return !isEventOrRefAttribute(attrName);
        }
        if (isFunctionNode(ancestor)) {
          const call = getCallThatReceivesFunction(ancestor);
          return !!call && REACTIVE_WRAPPERS.has(getCalleeName(call) ?? '');
        }
      }
      return false;
    }

    return {
      Program: enterScope,
      'Program:exit': exitScope,

      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,

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

      BinaryExpression(node) {
        if (!['===', '!==', '==', '!='].includes(node.operator)) return;
        const eachItemNames = currentEachItemNames();
        if (eachItemNames.size === 0) return;
        if (!isInsideTrackedRenderWork(node)) return;

        const leftSignal = isSignalGetterCall(node.left);
        const rightSignal = isSignalGetterCall(node.right);
        let signalName: string | null = null;

        if (leftSignal && containsAnyIdentifier(node.right, eachItemNames)) {
          signalName = leftSignal;
        } else if (rightSignal && containsAnyIdentifier(node.left, eachItemNames)) {
          signalName = rightSignal;
        }

        if (!signalName) return;
        context.report({
          node,
          messageId: 'preferSelector',
          data: { signal: signalName },
        });
      },
    };
  },
};
