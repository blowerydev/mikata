/**
 * Babel plugin that transforms JSX into direct DOM operations.
 *
 * Strategy: each native-element JSX tree compiles to a module-scope
 * `_template()` that cloneNode(true)s per instantiation. Walk code reaches
 * the elements that need wiring (events, reactive attrs, dynamic inserts);
 * fully-static subtrees stay baked into the template HTML and cost nothing
 * beyond the clone. Components and fragments fall back to `_createComponent`
 * / `_createFragment` and are inserted via `_insert` against comment markers.
 */

import type { PluginObj, types as BabelTypes } from '@babel/core';

const RUNTIME_MODULE = '@mikata/runtime';
const REACTIVITY_MODULE = '@mikata/reactivity';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

interface TemplateDecl {
  name: string;
  html: string;
}

interface PluginState {
  runtimeImports: Set<string>;
  reactivityImports: Set<string>;
  templateCount: number;
  templateDeclarations: TemplateDecl[];
}

type Plan =
  | ElementPlan
  | { kind: 'text'; text: string }
  | { kind: 'dynamic'; expr: BabelTypes.Expression; reactive: boolean; bakeText?: boolean }
  | { kind: 'node'; expr: BabelTypes.Expression };

interface ElementPlan {
  kind: 'element';
  tag: string;
  bakedAttrs: Array<[string, string]>;
  deferredOps: DeferredOp[];
  children: Plan[];
}

type DeferredOp =
  | { kind: 'event'; eventName: string; expr: BabelTypes.Expression }
  | { kind: 'reactive-attr'; name: string; expr: BabelTypes.Expression }
  | { kind: 'runtime-attr'; name: string; expr: BabelTypes.Expression }
  | { kind: 'ref'; expr: BabelTypes.Expression }
  | { kind: 'spread'; expr: BabelTypes.Expression };

export function mikataJSXPlugin({ types: t }: { types: typeof BabelTypes }): PluginObj<PluginState> {
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
    if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) return false;
    if (t.isLiteral(node)) return false;
    return false;
  }

  function isComponent(
    name: BabelTypes.JSXIdentifier | BabelTypes.JSXMemberExpression | BabelTypes.JSXNamespacedName
  ): boolean {
    if (t.isJSXIdentifier(name)) return /^[A-Z]/.test(name.name);
    if (t.isJSXMemberExpression(name)) return true;
    return false;
  }

  function jsxNameToExpression(
    name: BabelTypes.JSXIdentifier | BabelTypes.JSXMemberExpression | BabelTypes.JSXNamespacedName
  ): BabelTypes.Expression {
    if (t.isJSXIdentifier(name)) return t.identifier(name.name);
    if (t.isJSXMemberExpression(name)) {
      return t.memberExpression(
        jsxNameToExpression(name.object) as BabelTypes.Expression,
        t.identifier(name.property.name)
      );
    }
    throw new Error('Namespaced JSX names are not supported');
  }

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
      // Nested JSX in attr position — babel continuation will visit it.
      return value as any;
    }
    return t.identifier('undefined');
  }

  function isEventProp(name: string): boolean {
    return /^on[A-Z]/.test(name);
  }

  function eventName(propName: string): string {
    return propName.slice(2).toLowerCase();
  }

  function addRuntimeImport(state: PluginState, name: string): void {
    state.runtimeImports.add(name);
  }

  function addReactivityImport(state: PluginState, name: string): void {
    state.reactivityImports.add(name);
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // JSX text cleaning per React rules: split on newlines, strip indent from
  // inner line edges, drop empty lines, join with a space.
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

  function buildElementPlan(
    node: BabelTypes.JSXElement,
    state: PluginState
  ): ElementPlan {
    const tag = (node.openingElement.name as BabelTypes.JSXIdentifier).name;
    const plan: ElementPlan = {
      kind: 'element',
      tag,
      bakedAttrs: [],
      deferredOps: [],
      children: [],
    };

    for (const attr of node.openingElement.attributes) {
      if (t.isJSXSpreadAttribute(attr)) {
        plan.deferredOps.push({ kind: 'spread', expr: attr.argument });
        continue;
      }
      const name = (attr as BabelTypes.JSXAttribute).name;
      if (!t.isJSXIdentifier(name)) continue;
      const propName = name.name;
      const value = getAttrValue((attr as BabelTypes.JSXAttribute).value);

      if (propName === 'ref') {
        plan.deferredOps.push({ kind: 'ref', expr: value });
        continue;
      }
      if (isEventProp(propName)) {
        plan.deferredOps.push({ kind: 'event', eventName: eventName(propName), expr: value });
        continue;
      }
      if (isPotentiallyReactive(value)) {
        plan.deferredOps.push({ kind: 'reactive-attr', name: propName, expr: value });
        continue;
      }
      // Non-reactive — try to bake into template HTML.
      if (t.isBooleanLiteral(value)) {
        if (value.value) plan.bakedAttrs.push([propName, '']);
        continue;
      }
      if (t.isStringLiteral(value)) {
        plan.bakedAttrs.push([propName, value.value]);
        continue;
      }
      if (t.isNumericLiteral(value)) {
        plan.bakedAttrs.push([propName, String(value.value)]);
        continue;
      }
      plan.deferredOps.push({ kind: 'runtime-attr', name: propName, expr: value });
    }

    for (const child of node.children) {
      if (t.isJSXText(child)) {
        const cleaned = cleanJSXText(child.value);
        if (cleaned) plan.children.push({ kind: 'text', text: cleaned });
      } else if (t.isJSXExpressionContainer(child)) {
        if (t.isJSXEmptyExpression(child.expression)) continue;
        const expr = child.expression;
        if (t.isStringLiteral(expr)) {
          plan.children.push({ kind: 'text', text: expr.value });
        } else if (t.isNumericLiteral(expr)) {
          plan.children.push({ kind: 'text', text: String(expr.value) });
        } else {
          plan.children.push({
            kind: 'dynamic',
            expr,
            reactive: isPotentiallyReactive(expr),
          });
        }
      } else if (t.isJSXElement(child)) {
        if (isComponent(child.openingElement.name)) {
          // Component child — treat as opaque Node to insert via marker.
          const compExpr = transformComponent(child, state);
          plan.children.push({ kind: 'node', expr: compExpr });
        } else {
          plan.children.push(buildElementPlan(child, state));
        }
      } else if (t.isJSXFragment(child)) {
        plan.children.push({ kind: 'node', expr: transformFragment(child, state) });
      }
    }

    // Text-bake optimisation: `<el>{expr}</el>` where the dynamic is the ONLY
    // child. Instead of emitting `_insert(el, expr)` — which creates a Text
    // node and appendChilds — we bake a whitespace Text node into the template
    // HTML and have the walker assign `.data` on it. Eliminates
    // createTextNode + appendChild per slot, the single biggest remaining
    // creation-benchmark cost vs Solid.
    //
    // Skip when the expression is a call to a known Node-returning helper
    // (`each`, `show`, etc.) — stringifying a DocumentFragment into `.data`
    // produces garbage like "[object DocumentFragment]". All other
    // expressions fall through; if a user hands us a DOM Node there, they'll
    // see the same stringification — same contract as React/Solid text.
    if (plan.children.length === 1 && plan.children[0].kind === 'dynamic') {
      const c = plan.children[0];
      if (!isNodeReturningCall(c.expr)) {
        c.bakeText = true;
      }
    }

    return plan;
  }

  // Calls whose return is a DOM Node / Fragment — must NOT be text-baked.
  const NODE_RETURNING_CALLS = new Set([
    'each', 'show', 'switchMatch', 'Dynamic', 'For', 'Portal',
    '_createComponent', '_createFragment',
  ]);

  function isNodeReturningCall(expr: BabelTypes.Expression): boolean {
    if (!t.isCallExpression(expr)) return false;
    const callee = expr.callee;
    if (t.isIdentifier(callee)) return NODE_RETURNING_CALLS.has(callee.name);
    return false;
  }

  function emitTemplateHTML(plan: Plan, parent?: ElementPlan, indexInParent?: number): string {
    if (plan.kind === 'text') return escapeHtml(plan.text);
    if (plan.kind === 'dynamic') {
      // Text-bake: bake a space placeholder the walker will mutate via `.data`.
      if (plan.bakeText) return ' ';
      // Tail-dynamic optimisation: if this is the last child of its parent,
      // skip the comment marker and let the walker emit `_insert` with no
      // marker (appendChild semantics). Saves one comment node per slot.
      if (parent && indexInParent === parent.children.length - 1) {
        return '';
      }
      return '<!>';
    }
    if (plan.kind === 'node') {
      if (parent && indexInParent === parent.children.length - 1) {
        return '';
      }
      return '<!>';
    }
    const tag = plan.tag.toLowerCase();
    let html = `<${tag}`;
    for (const [name, value] of plan.bakedAttrs) {
      html += value === '' ? ` ${name}` : ` ${name}="${escapeAttr(value)}"`;
    }
    html += '>';
    if (!VOID_ELEMENTS.has(tag)) {
      for (let i = 0; i < plan.children.length; i++) {
        html += emitTemplateHTML(plan.children[i], plan, i);
      }
      html += `</${tag}>`;
    }
    return html;
  }

  function needsWalking(plan: Plan): boolean {
    if (plan.kind === 'text') return false;
    if (plan.kind !== 'element') return true;
    if (plan.deferredOps.length > 0) return true;
    return plan.children.some(needsWalking);
  }

  function isTailDynamic(plan: ElementPlan, i: number): boolean {
    if (i !== plan.children.length - 1) return false;
    const c = plan.children[i];
    return c.kind === 'dynamic' || c.kind === 'node';
  }

  function emitOp(
    op: DeferredOp,
    targetId: BabelTypes.Identifier,
    state: PluginState,
    stmts: BabelTypes.Statement[]
  ): void {
    if (op.kind === 'event') {
      stmts.push(t.expressionStatement(
        t.callExpression(
          t.memberExpression(targetId, t.identifier('addEventListener')),
          [t.stringLiteral(op.eventName), op.expr]
        )
      ));
    } else if (op.kind === 'reactive-attr') {
      addRuntimeImport(state, '_setProp');
      addReactivityImport(state, 'renderEffect');
      stmts.push(t.expressionStatement(
        t.callExpression(t.identifier('renderEffect'), [
          t.arrowFunctionExpression([], t.callExpression(t.identifier('_setProp'), [
            targetId, t.stringLiteral(op.name), op.expr,
          ])),
        ])
      ));
    } else if (op.kind === 'runtime-attr') {
      addRuntimeImport(state, '_setProp');
      stmts.push(t.expressionStatement(
        t.callExpression(t.identifier('_setProp'), [
          targetId, t.stringLiteral(op.name), op.expr,
        ])
      ));
    } else if (op.kind === 'ref') {
      stmts.push(t.expressionStatement(t.callExpression(op.expr, [targetId])));
    } else if (op.kind === 'spread') {
      addRuntimeImport(state, '_spread');
      stmts.push(t.expressionStatement(
        t.callExpression(t.identifier('_spread'), [
          targetId, t.arrowFunctionExpression([], op.expr),
        ])
      ));
    }
  }

  function emitChildInsert(
    parentId: BabelTypes.Identifier,
    markerId: BabelTypes.Identifier | null,
    child: Plan,
    state: PluginState,
    stmts: BabelTypes.Statement[]
  ): void {
    addRuntimeImport(state, '_insert');
    let valueArg: BabelTypes.Expression;
    if (child.kind === 'dynamic') {
      if (child.reactive) addReactivityImport(state, 'renderEffect');
      valueArg = child.reactive
        ? t.arrowFunctionExpression([], child.expr)
        : child.expr;
    } else if (child.kind === 'node') {
      valueArg = child.expr;
    } else {
      return;
    }
    const args: BabelTypes.Expression[] = [parentId, valueArg];
    if (markerId) args.push(markerId);
    stmts.push(t.expressionStatement(t.callExpression(t.identifier('_insert'), args)));
  }

  function walkAndEmit(
    plan: ElementPlan,
    elementId: BabelTypes.Identifier,
    state: PluginState,
    stmts: BabelTypes.Statement[],
    mkUid: () => BabelTypes.Identifier
  ): void {
    for (const op of plan.deferredOps) {
      emitOp(op, elementId, state, stmts);
    }

    // Text-bake fast path: element with exactly one dynamic child whose
    // template node is the baked whitespace Text. Walk to firstChild and
    // assign `.data` directly — one DOM op, no allocations. For reactive
    // exprs wrap in renderEffect so `.data` updates on signal change.
    if (
      plan.children.length === 1 &&
      plan.children[0].kind === 'dynamic' &&
      plan.children[0].bakeText
    ) {
      const child = plan.children[0];
      const textId = mkUid();
      stmts.push(t.variableDeclaration('const', [
        t.variableDeclarator(
          textId,
          t.memberExpression(elementId, t.identifier('firstChild')),
        ),
      ]));
      // `value ?? ''` coerces null/undefined to empty string; anything else
      // stringifies via the DOM's implicit toString on `.data`.
      const assign = t.assignmentExpression(
        '=',
        t.memberExpression(textId, t.identifier('data')),
        t.logicalExpression('??', child.expr, t.stringLiteral('')),
      );
      if (child.reactive) {
        addReactivityImport(state, 'renderEffect');
        // Arrow MUST have a block body: expression-bodied arrows return the
        // assignment's value, which `renderEffect` then stores as `_cleanup`
        // and invokes on re-run / dispose — crashing on "string is not a
        // function". Block body makes the return `void`.
        stmts.push(t.expressionStatement(t.callExpression(t.identifier('renderEffect'), [
          t.arrowFunctionExpression(
            [],
            t.blockStatement([t.expressionStatement(assign)]),
          ),
        ])));
      } else {
        stmts.push(t.expressionStatement(assign));
      }
      return;
    }

    // Walk children in order, emitting refs only for nodes that need wiring.
    // Gap-skipping: track the template index of the last emitted ref so
    // sibling chains can be computed with the right number of nextSibling
    // hops when static children sit between two wired ones. Tail-dynamic
    // children produce no template node, so we keep a separate "template
    // index" counter that advances only for children that emit HTML.
    let lastId: BabelTypes.Identifier | null = null;
    let lastTplIdx = -1;
    let tplIdx = 0;

    for (let i = 0; i < plan.children.length; i++) {
      const child = plan.children[i];
      const tail = isTailDynamic(plan, i);

      if (tail) {
        // Emitted with no marker — no walk ref, no tplIdx bump (not in HTML).
        emitChildInsert(elementId, null, child, state, stmts);
        continue;
      }

      const myTplIdx = tplIdx++;

      if (!needsWalking(child)) continue;

      const childId = mkUid();
      let navExpr: BabelTypes.Expression;
      if (lastId === null) {
        navExpr = t.memberExpression(elementId, t.identifier('firstChild'));
        for (let j = 0; j < myTplIdx; j++) {
          navExpr = t.memberExpression(navExpr, t.identifier('nextSibling'));
        }
      } else {
        navExpr = t.memberExpression(lastId, t.identifier('nextSibling'));
        for (let j = 0; j < (myTplIdx - lastTplIdx - 1); j++) {
          navExpr = t.memberExpression(navExpr, t.identifier('nextSibling'));
        }
      }
      stmts.push(t.variableDeclaration('const', [
        t.variableDeclarator(childId, navExpr),
      ]));
      lastId = childId;
      lastTplIdx = myTplIdx;

      if (child.kind === 'element') {
        walkAndEmit(child, childId, state, stmts, mkUid);
      } else {
        emitChildInsert(elementId, childId, child, state, stmts);
      }
    }
  }

  function transformNativeElement(
    node: BabelTypes.JSXElement,
    state: PluginState
  ): BabelTypes.Expression {
    const plan = buildElementPlan(node, state);
    addRuntimeImport(state, '_template');

    const tmplName = `_tmpl$${state.templateCount++}`;
    const html = emitTemplateHTML(plan);
    state.templateDeclarations.push({ name: tmplName, html });

    const stmts: BabelTypes.Statement[] = [];
    let elCounter = 0;
    const mkUid = (): BabelTypes.Identifier => {
      const name = elCounter === 0 ? '_el' : `_el$${elCounter}`;
      elCounter++;
      return t.identifier(name);
    };

    const rootId = mkUid();
    stmts.push(t.variableDeclaration('const', [
      t.variableDeclarator(
        rootId,
        t.callExpression(
          t.memberExpression(t.identifier(tmplName), t.identifier('cloneNode')),
          [t.booleanLiteral(true)]
        )
      ),
    ]));

    walkAndEmit(plan, rootId, state, stmts, mkUid);

    stmts.push(t.returnStatement(rootId));
    return t.callExpression(t.arrowFunctionExpression([], t.blockStatement(stmts)), []);
  }

  function transformComponent(
    node: BabelTypes.JSXElement,
    state: PluginState
  ): BabelTypes.Expression {
    const opening = node.openingElement;
    const componentExpr = jsxNameToExpression(opening.name);

    addRuntimeImport(state, '_createComponent');

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

      const isValidIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(propName);
      const keyNode: BabelTypes.Identifier | BabelTypes.StringLiteral = isValidIdentifier
        ? t.identifier(propName)
        : t.stringLiteral(propName);

      if (isPotentiallyReactive(value)) {
        if (isValidIdentifier) {
          propsProperties.push(
            t.objectMethod(
              'get',
              t.identifier(propName),
              [],
              t.blockStatement([t.returnStatement(value)])
            ) as any
          );
        } else {
          propsProperties.push(t.objectProperty(keyNode, value));
        }
      } else {
        propsProperties.push(t.objectProperty(keyNode, value));
      }
    }

    // Children — transform JSX children inline so component output is
    // self-contained (enter visitor skips nested JSX).
    const rawChildren = node.children.filter(
      (child) => !t.isJSXText(child) || child.value.trim() !== ''
    );

    if (rawChildren.length > 0) {
      const childExprs: BabelTypes.Expression[] = [];
      for (const child of rawChildren) {
        if (t.isJSXText(child)) {
          const text = child.value.replace(/\s+/g, ' ').trim();
          if (text) childExprs.push(t.stringLiteral(text));
        } else if (t.isJSXExpressionContainer(child)) {
          if (!t.isJSXEmptyExpression(child.expression)) {
            childExprs.push(child.expression);
          }
        } else if (t.isJSXElement(child)) {
          if (isComponent(child.openingElement.name)) {
            childExprs.push(transformComponent(child, state));
          } else {
            childExprs.push(transformNativeElement(child, state));
          }
        } else if (t.isJSXFragment(child)) {
          childExprs.push(transformFragment(child, state));
        }
      }

      // Children getter — evaluated inside the component's setup scope so
      // context `inject()` can walk past the provider's scope boundary.
      if (childExprs.length === 1) {
        propsProperties.push(
          t.objectMethod(
            'get',
            t.identifier('children'),
            [],
            t.blockStatement([t.returnStatement(childExprs[0])])
          ) as any
        );
      } else if (childExprs.length > 1) {
        propsProperties.push(
          t.objectMethod(
            'get',
            t.identifier('children'),
            [],
            t.blockStatement([t.returnStatement(t.arrayExpression(childExprs))])
          ) as any
        );
      }
    }

    const propsObj = t.objectExpression(propsProperties as any[]);

    if (hasSpread) {
      addRuntimeImport(state, '_mergeProps');
      return t.callExpression(t.identifier('_createComponent'), [
        componentExpr,
        t.callExpression(t.identifier('_mergeProps'), [...spreadArgs, propsObj]),
      ]);
    }

    return t.callExpression(t.identifier('_createComponent'), [
      componentExpr,
      propsObj,
    ]);
  }

  function transformFragment(
    node: BabelTypes.JSXFragment,
    state: PluginState
  ): BabelTypes.Expression {
    addRuntimeImport(state, '_createFragment');

    const children = node.children.filter(
      (child) => !t.isJSXText(child) || child.value.trim() !== ''
    );

    const childExprs: BabelTypes.Expression[] = [];
    for (const child of children) {
      if (t.isJSXText(child)) {
        const text = child.value.replace(/\s+/g, ' ').trim();
        if (text) {
          childExprs.push(t.callExpression(
            t.memberExpression(t.identifier('document'), t.identifier('createTextNode')),
            [t.stringLiteral(text)]
          ));
        }
      } else if (t.isJSXExpressionContainer(child)) {
        if (!t.isJSXEmptyExpression(child.expression)) {
          childExprs.push(child.expression);
        }
      } else if (t.isJSXElement(child)) {
        if (isComponent(child.openingElement.name)) {
          childExprs.push(transformComponent(child, state));
        } else {
          childExprs.push(transformNativeElement(child, state));
        }
      } else if (t.isJSXFragment(child)) {
        childExprs.push(transformFragment(child, state));
      }
    }

    return t.callExpression(t.identifier('_createFragment'), [
      t.arrayExpression(childExprs),
    ]);
  }

  return {
    name: 'mikata-jsx',

    pre() {
      this.runtimeImports = new Set();
      this.reactivityImports = new Set();
      this.templateCount = 0;
      this.templateDeclarations = [];
    },

    visitor: {
      JSXElement: {
        enter(path, state) {
          // Only transform the outermost JSX element in each tree; the
          // transform recurses into nested JSX manually, so nested elements
          // must not be hit by this visitor while their parent is still JSX.
          // After replaceWith() the parent becomes a CallExpression and babel
          // continues traversal — any JSX left in attr-value expressions is
          // picked up then.
          if (path.findParent((p) => t.isJSXElement(p.node) || t.isJSXFragment(p.node))) {
            return;
          }
          const node = path.node;
          const result = isComponent(node.openingElement.name)
            ? transformComponent(node, state)
            : transformNativeElement(node, state);
          path.replaceWith(result);
        },
      },

      JSXFragment: {
        enter(path, state) {
          if (path.findParent((p) => t.isJSXElement(p.node) || t.isJSXFragment(p.node))) {
            return;
          }
          path.replaceWith(transformFragment(path.node, state));
        },
      },

      VariableDeclarator: {
        exit(path) {
          // Auto-label signal() and computed() calls with the binding name so
          // dev tools can identify them without the user writing
          // `signal(0, 'count')`. Only fires when the user hasn't provided
          // their own label. The label is gated on `__DEV__` so production
          // bundles can strip the string literal.
          const init = path.node.init;
          if (!init || !t.isCallExpression(init)) return;
          const callee = init.callee;
          if (!t.isIdentifier(callee)) return;

          let name: string | null = null;
          if (callee.name === 'signal') {
            if (init.arguments.length > 1) return;
            if (!t.isArrayPattern(path.node.id)) return;
            const first = path.node.id.elements[0];
            if (!first || !t.isIdentifier(first)) return;
            name = first.name;
          } else if (callee.name === 'computed') {
            if (init.arguments.length > 1) return;
            if (!t.isIdentifier(path.node.id)) return;
            name = path.node.id.name;
          } else {
            return;
          }

          init.arguments.push(t.stringLiteral(name));
        },
      },
    },

    post(state) {
      const program = state.ast.program;

      // Template declarations — emit after imports so `_template` is bound.
      if (this.templateDeclarations.length > 0) {
        const decls = this.templateDeclarations.map(({ name, html }) =>
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier(name),
              t.callExpression(t.identifier('_template'), [t.stringLiteral(html)])
            ),
          ])
        );
        program.body.unshift(...decls);
      }

      if (this.runtimeImports.size > 0) {
        const specifiers = [...this.runtimeImports].map((name) =>
          t.importSpecifier(t.identifier(name), t.identifier(name))
        );
        program.body.unshift(
          t.importDeclaration(specifiers, t.stringLiteral(RUNTIME_MODULE))
        );
      }

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
