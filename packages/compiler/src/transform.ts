/**
 * Babel plugin that transforms JSX into direct DOM operations.
 *
 * Instead of creating virtual DOM nodes, JSX compiles to:
 * - document.createElement / template.cloneNode for elements
 * - _renderEffect() for dynamic text/attributes
 * - addEventListener for events
 * - _createComponent() for component calls
 */

import type { PluginObj, types as BabelTypes } from '@babel/core';

// Runtime import identifiers — these are added as imports to each file
const RUNTIME_MODULE = '@mikata/runtime';
const REACTIVITY_MODULE = '@mikata/reactivity';

interface PluginState {
  runtimeImports: Set<string>;
  reactivityImports: Set<string>;
  templateCount: number;
}

export function mikataJSXPlugin({ types: t }: { types: typeof BabelTypes }): PluginObj<PluginState> {
  /**
   * Check if an expression is potentially reactive (needs an effect wrapper).
   * Heuristic: function calls, member expressions, or identifiers that
   * could be signal getters.
   */
  function isPotentiallyReactive(node: BabelTypes.Expression): boolean {
    if (t.isCallExpression(node)) return true;
    if (t.isMemberExpression(node)) return true;
    if (t.isConditionalExpression(node)) {
      return (
        isPotentiallyReactive(node.test) ||
        isPotentiallyReactive(node.consequent) ||
        isPotentiallyReactive(node.alternate)
      );
    }
    if (t.isBinaryExpression(node)) {
      return (
        isPotentiallyReactive(node.left as BabelTypes.Expression) ||
        isPotentiallyReactive(node.right as BabelTypes.Expression)
      );
    }
    if (t.isTemplateLiteral(node)) {
      return node.expressions.some((e) => isPotentiallyReactive(e as BabelTypes.Expression));
    }
    if (t.isLogicalExpression(node)) {
      return isPotentiallyReactive(node.left) || isPotentiallyReactive(node.right);
    }
    if (t.isUnaryExpression(node)) {
      return isPotentiallyReactive(node.argument as BabelTypes.Expression);
    }
    // Arrow functions / function expressions are not reactive
    if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) return false;
    // Literals are never reactive
    if (t.isLiteral(node)) return false;
    return false;
  }

  /**
   * Check if a JSX element name starts with uppercase (component) or
   * lowercase (native HTML element).
   */
  function isComponent(
    name: BabelTypes.JSXIdentifier | BabelTypes.JSXMemberExpression | BabelTypes.JSXNamespacedName
  ): boolean {
    if (t.isJSXIdentifier(name)) {
      return /^[A-Z]/.test(name.name);
    }
    if (t.isJSXMemberExpression(name)) return true;
    return false;
  }

  /**
   * Convert a JSX element name to a regular expression/identifier.
   */
  function jsxNameToExpression(
    name: BabelTypes.JSXIdentifier | BabelTypes.JSXMemberExpression | BabelTypes.JSXNamespacedName
  ): BabelTypes.Expression {
    if (t.isJSXIdentifier(name)) {
      return t.identifier(name.name);
    }
    if (t.isJSXMemberExpression(name)) {
      return t.memberExpression(
        jsxNameToExpression(name.object) as BabelTypes.Expression,
        t.identifier(name.property.name)
      );
    }
    throw new Error('Namespaced JSX names are not supported');
  }

  /**
   * Extract the value from a JSX attribute value.
   */
  function getAttrValue(
    value: BabelTypes.JSXAttribute['value']
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
      // Nested JSX — will be transformed by the visitor
      return value as any;
    }
    return t.identifier('undefined');
  }

  /**
   * Check if a string is an event handler prop (onClick, onInput, etc.)
   */
  function isEventProp(name: string): boolean {
    return /^on[A-Z]/.test(name);
  }

  /**
   * Convert event prop name to DOM event name: onClick -> click
   */
  function eventName(propName: string): string {
    return propName.slice(2).toLowerCase();
  }

  function addRuntimeImport(state: PluginState, name: string): void {
    state.runtimeImports.add(name);
  }

  function addReactivityImport(state: PluginState, name: string): void {
    state.reactivityImports.add(name);
  }

  /**
   * Transform a native HTML element's JSX.
   */
  function transformElement(
    path: any,
    state: PluginState
  ): BabelTypes.Expression {
    const node = path.node as BabelTypes.JSXElement;
    const opening = node.openingElement;
    const tagName = (opening.name as BabelTypes.JSXIdentifier).name;

    addRuntimeImport(state, '_createElement');

    const stmts: BabelTypes.Statement[] = [];
    const elemId = path.scope.generateUidIdentifier('el');

    // const _el = _createElement("div")
    stmts.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          elemId,
          t.callExpression(t.identifier('_createElement'), [
            t.stringLiteral(tagName),
          ])
        ),
      ])
    );

    // Process attributes
    for (const attr of opening.attributes) {
      if (t.isJSXSpreadAttribute(attr)) {
        // Spread: _spread(_el, () => props)
        addRuntimeImport(state, '_spread');
        const arg = attr.argument;
        stmts.push(
          t.expressionStatement(
            t.callExpression(t.identifier('_spread'), [
              elemId,
              t.arrowFunctionExpression([], arg),
            ])
          )
        );
        continue;
      }

      const name = (attr as BabelTypes.JSXAttribute).name;
      if (!t.isJSXIdentifier(name)) continue;
      const propName = name.name;
      const value = getAttrValue((attr as BabelTypes.JSXAttribute).value);

      if (propName === 'ref') {
        // ref={myRef} -> myRef(_el)
        stmts.push(
          t.expressionStatement(
            t.callExpression(value, [elemId])
          )
        );
      } else if (isEventProp(propName)) {
        // onClick={handler} -> _el.addEventListener("click", handler)
        stmts.push(
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(elemId, t.identifier('addEventListener')),
              [t.stringLiteral(eventName(propName)), value]
            )
          )
        );
      } else if (isPotentiallyReactive(value)) {
        // Dynamic attribute: _renderEffect(() => { _setProp(_el, "class", expr) })
        addRuntimeImport(state, '_setProp');
        addReactivityImport(state, 'renderEffect');
        stmts.push(
          t.expressionStatement(
            t.callExpression(t.identifier('renderEffect'), [
              t.arrowFunctionExpression(
                [],
                t.callExpression(t.identifier('_setProp'), [
                  elemId,
                  t.stringLiteral(propName),
                  value,
                ])
              ),
            ])
          )
        );
      } else {
        // Static attribute: _setProp(_el, "class", "container")
        addRuntimeImport(state, '_setProp');
        stmts.push(
          t.expressionStatement(
            t.callExpression(t.identifier('_setProp'), [
              elemId,
              t.stringLiteral(propName),
              value,
            ])
          )
        );
      }
    }

    // Process children
    const children = node.children.filter(
      (child) => !t.isJSXText(child) || child.value.trim() !== ''
    );

    for (const child of children) {
      if (t.isJSXText(child)) {
        // Static text
        const text = child.value.replace(/\s+/g, ' ').trim();
        if (text) {
          stmts.push(
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(elemId, t.identifier('appendChild')),
                [
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('document'),
                      t.identifier('createTextNode')
                    ),
                    [t.stringLiteral(text)]
                  ),
                ]
              )
            )
          );
        }
      } else if (t.isJSXExpressionContainer(child)) {
        if (t.isJSXEmptyExpression(child.expression)) continue;

        const expr = child.expression;

        if (isPotentiallyReactive(expr)) {
          // Dynamic child: create a text node, update via renderEffect
          addRuntimeImport(state, '_insert');
          addReactivityImport(state, 'renderEffect');

          stmts.push(
            t.expressionStatement(
              t.callExpression(t.identifier('_insert'), [
                elemId,
                t.arrowFunctionExpression([], expr),
              ])
            )
          );
        } else {
          // Static expression child
          addRuntimeImport(state, '_insert');
          stmts.push(
            t.expressionStatement(
              t.callExpression(t.identifier('_insert'), [
                elemId,
                t.arrowFunctionExpression([], expr),
              ])
            )
          );
        }
      } else {
        // Child element (already transformed by exit visitor into an expression)
        // or any other expression — appendChild it
        stmts.push(
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(elemId, t.identifier('appendChild')),
              [child as any]
            )
          )
        );
      }
    }

    // return _el
    stmts.push(t.returnStatement(elemId));

    // Wrap in IIFE: (() => { ... })()
    return t.callExpression(
      t.arrowFunctionExpression([], t.blockStatement(stmts)),
      []
    );
  }

  /**
   * Transform a component JSX call.
   */
  function transformComponent(
    path: any,
    state: PluginState
  ): BabelTypes.Expression {
    const node = path.node as BabelTypes.JSXElement;
    const opening = node.openingElement;
    const componentExpr = jsxNameToExpression(opening.name);

    addRuntimeImport(state, '_createComponent');

    // Build props object
    const propsProperties: BabelTypes.ObjectProperty[] = [];
    let hasSpread = false;
    const spreadArgs: BabelTypes.Expression[] = [];

    for (const attr of opening.attributes) {
      if (t.isJSXSpreadAttribute(attr)) {
        hasSpread = true;
        spreadArgs.push(attr.argument);
        continue;
      }

      const name = (attr as BabelTypes.JSXAttribute).name;
      if (!t.isJSXIdentifier(name)) continue;
      const propName = name.name;
      const value = getAttrValue((attr as BabelTypes.JSXAttribute).value);

      if (isPotentiallyReactive(value)) {
        // Reactive prop -> getter: get propName() { return expr }
        propsProperties.push(
          t.objectProperty(
            t.identifier(propName),
            value
          )
        );
        // Mark as getter using a method
        const lastProp = propsProperties[propsProperties.length - 1];
        // Use Object.defineProperty approach via _createComponent
        // Actually, we'll use get syntax
        const getterMethod = t.objectMethod(
          'get',
          t.identifier(propName),
          [],
          t.blockStatement([t.returnStatement(value)])
        );
        propsProperties.pop();
        propsProperties.push(getterMethod as any);
      } else {
        // Static prop -> regular property
        propsProperties.push(
          t.objectProperty(t.identifier(propName), value)
        );
      }
    }

    // Process children
    const children = node.children.filter(
      (child) => !t.isJSXText(child) || child.value.trim() !== ''
    );

    if (children.length > 0) {
      // Add children prop
      const childExprs: BabelTypes.Expression[] = [];

      for (const child of children) {
        if (t.isJSXText(child)) {
          const text = child.value.replace(/\s+/g, ' ').trim();
          if (text) childExprs.push(t.stringLiteral(text));
        } else if (t.isJSXExpressionContainer(child)) {
          if (!t.isJSXEmptyExpression(child.expression)) {
            childExprs.push(child.expression);
          }
        } else {
          childExprs.push(child as any);
        }
      }

      if (childExprs.length === 1) {
        propsProperties.push(
          t.objectProperty(t.identifier('children'), childExprs[0])
        );
      } else if (childExprs.length > 1) {
        propsProperties.push(
          t.objectProperty(
            t.identifier('children'),
            t.arrayExpression(childExprs)
          )
        );
      }
    }

    const propsObj = t.objectExpression(propsProperties as any[]);

    if (hasSpread) {
      // Merge spread props with explicit props
      addRuntimeImport(state, '_mergeProps');
      return t.callExpression(t.identifier('_createComponent'), [
        componentExpr,
        t.callExpression(t.identifier('_mergeProps'), [
          ...spreadArgs,
          propsObj,
        ]),
      ]);
    }

    return t.callExpression(t.identifier('_createComponent'), [
      componentExpr,
      propsObj,
    ]);
  }

  return {
    name: 'mikata-jsx',

    pre() {
      this.runtimeImports = new Set();
      this.reactivityImports = new Set();
      this.templateCount = 0;
    },

    visitor: {
      JSXElement: {
        exit(path, state) {
          const name = path.node.openingElement.name;
          let result: BabelTypes.Expression;

          if (isComponent(name)) {
            result = transformComponent(path, state);
          } else {
            result = transformElement(path, state);
          }

          path.replaceWith(result);
        },
      },

      JSXFragment: {
        exit(path, state) {
          // Fragments: create a DocumentFragment with children
          addRuntimeImport(state, '_createFragment');

          const children = path.node.children.filter(
            (child) => !t.isJSXText(child) || child.value.trim() !== ''
          );

          const childExprs: BabelTypes.Expression[] = [];
          for (const child of children) {
            if (t.isJSXText(child)) {
              const text = child.value.replace(/\s+/g, ' ').trim();
              if (text) {
                childExprs.push(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('document'),
                      t.identifier('createTextNode')
                    ),
                    [t.stringLiteral(text)]
                  )
                );
              }
            } else if (t.isJSXExpressionContainer(child)) {
              if (!t.isJSXEmptyExpression(child.expression)) {
                childExprs.push(child.expression);
              }
            } else {
              childExprs.push(child as any);
            }
          }

          path.replaceWith(
            t.callExpression(t.identifier('_createFragment'), [
              t.arrayExpression(childExprs),
            ])
          );
        },
      },
    },

    post(state) {
      const program = state.ast.program;

      // Add runtime imports
      if (this.runtimeImports.size > 0) {
        const specifiers = [...this.runtimeImports].map((name) =>
          t.importSpecifier(t.identifier(name), t.identifier(name))
        );
        program.body.unshift(
          t.importDeclaration(specifiers, t.stringLiteral(RUNTIME_MODULE))
        );
      }

      // Add reactivity imports
      if (this.reactivityImports.size > 0) {
        const specifiers = [...this.reactivityImports].map((name) =>
          t.importSpecifier(t.identifier(name), t.identifier(name))
        );
        program.body.unshift(
          t.importDeclaration(specifiers, t.stringLiteral(REACTIVITY_MODULE))
        );
      }
    },
  };
}
