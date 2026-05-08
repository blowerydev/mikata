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
import { createTransformHelpers } from './transform-helpers';
import {
  DELEGATED_EVENTS,
  REACTIVITY_MODULE,
  RUNTIME_MODULE,
  VOID_ELEMENTS,
  type DeferredOp,
  type ElementPlan,
  type Plan,
  type PluginState,
  type Scope,
} from './transform-types';

export function mikataJSXPlugin({ types: t }: { types: typeof BabelTypes }): PluginObj<PluginState> {
  const {
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
  } = createTransformHelpers(t);

  function addRuntimeImport(state: PluginState, name: string): void {
    state.runtimeImports.add(name);
  }

  function addReactivityImport(state: PluginState, name: string): void {
    state.reactivityImports.add(name);
  }

  function buildElementPlan(
    node: BabelTypes.JSXElement,
    state: PluginState,
    scope?: Scope,
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
      if (isPotentiallyReactive(value, scope)) {
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
            reactive: isPotentiallyReactive(expr, scope),
          });
        }
      } else if (t.isJSXElement(child)) {
        if (isComponent(child.openingElement.name)) {
          // Component child — treat as opaque Node to insert via marker.
          const compExpr = transformComponent(child, state, scope);
          plan.children.push({ kind: 'node', expr: compExpr });
        } else {
          plan.children.push(buildElementPlan(child, state, scope));
        }
      } else if (t.isJSXFragment(child)) {
        plan.children.push({ kind: 'node', expr: transformFragment(child, state, scope) });
      }
    }

    // Text-bake optimisation: `<el>{expr}</el>` where the dynamic is the ONLY
    // child. Instead of emitting `_insert(el, expr)` — which creates a Text
    // node and appendChilds — we bake a whitespace Text node into the template
    // HTML and have the walker assign `.data` on it. Eliminates
    // createTextNode + appendChild per slot, the single biggest remaining
    // creation-benchmark cost vs Solid.
    //
    // Skip when the expression is known to produce a non-primitive (a Node,
    // a function accessor, an array of nodes, ...) — stringifying those
    // into `.data` produces garbage like "[object DocumentFragment]" or
    // the raw source text of an arrow. All other expressions fall through;
    // `.data` assignment implicitly coerces signals/primitives to string
    // which is the intended fast path.
    if (plan.children.length === 1 && plan.children[0].kind === 'dynamic') {
      const c = plan.children[0];
      if (!isNonPrimitiveExpr(c.expr)) {
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

  /**
   * Conservative static check: does this expression clearly produce a
   * non-primitive (Node, array, function) that must go through `_insert`
   * rather than straight `.data` assignment?
   *
   * Used to decide whether to apply the text-bake optimisation. The goal
   * is not completeness - it's false-negative-safety: if we're unsure we
   * text-bake (which is fine for strings/numbers) but we want to catch
   * the common "obviously not a string" shapes so they don't silently
   * stringify to garbage.
   */
  function isNonPrimitiveExpr(expr: BabelTypes.Expression): boolean {
    // Arrow / function expression: a function accessor consumed by
    // `_insert`'s reactive path. Must not be stringified as source.
    if (
      t.isArrowFunctionExpression(expr) ||
      t.isFunctionExpression(expr)
    ) {
      return true;
    }
    // Array literal: user likely returning a list of nodes/values.
    if (t.isArrayExpression(expr)) return true;
    // JSX: a bare <X/> in an expression position produces a node.
    if (t.isJSXElement(expr) || t.isJSXFragment(expr)) return true;
    // Conditional `cond ? a : b`: text-bake only if *both* branches are
    // safe. A branch returning a node would stringify to garbage.
    if (t.isConditionalExpression(expr)) {
      return (
        isNonPrimitiveExpr(expr.consequent) ||
        isNonPrimitiveExpr(expr.alternate)
      );
    }
    // Logical `&&`, `||`, `??`: the expression can evaluate to the
    // right-hand side, so if that side is non-primitive we must not
    // bake. We also check the left of `||` / `??` since it's the
    // fallback when the right hasn't taken over.
    if (t.isLogicalExpression(expr)) {
      return isNonPrimitiveExpr(expr.right) || isNonPrimitiveExpr(expr.left);
    }
    // Parenthesized expressions are usually wrapped as the inner type
    // directly, but defensively unwrap and recurse.
    if ((expr as { type: string }).type === 'ParenthesizedExpression') {
      return isNonPrimitiveExpr((expr as unknown as { expression: BabelTypes.Expression }).expression);
    }
    // TS assertion shapes: `expr as T`, `<T>expr`, `expr!`. Unwrap.
    if (t.isTSAsExpression(expr) || t.isTSTypeAssertion(expr) || t.isTSNonNullExpression(expr)) {
      return isNonPrimitiveExpr(expr.expression);
    }
    // Common array-producing method calls. In JSX child position these
    // almost always hold node arrays the compiler must send through
    // `_insert` rather than stringify into `.data`.
    if (t.isCallExpression(expr) && t.isMemberExpression(expr.callee)) {
      const obj = expr.callee.object;
      const member = expr.callee.property;
      if (t.isIdentifier(member)) {
        if (ARRAY_METHODS.has(member.name)) return true;
      }
      // `Array.from(...)`, `Array.of(...)` — static builders.
      if (
        t.isIdentifier(obj) &&
        obj.name === 'Array' &&
        t.isIdentifier(member) &&
        (member.name === 'from' || member.name === 'of')
      ) {
        return true;
      }
    }
    // Bare-identifier calls like `routeOutlet()`, `render()`, or any
    // user helper — we can't prove the return is primitive, and
    // stringifying a Node to `.data` produces "[object HTMLElement]"
    // garbage. Route these through `_insert` (which has a text-to-text
    // fast path so simple-primitive cases like `{count()}` still mutate
    // `.data` in place, no DOM churn). Well-known coercion builtins
    // stay on the bake path.
    if (t.isCallExpression(expr) && t.isIdentifier(expr.callee)) {
      if (!PRIMITIVE_CALL_IDENTIFIERS.has(expr.callee.name)) return true;
    }
    // Direct calls to Mikata's node-returning helpers.
    return isNodeReturningCall(expr);
  }

  // Identifier-call names the compiler treats as definitely primitive.
  // Used to preserve the text-bake fast path for obvious string/number
  // coercions without forcing users through `_insert`.
  const PRIMITIVE_CALL_IDENTIFIERS = new Set([
    'String', 'Number', 'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  ]);

  // Array-prototype methods whose return value is another array. `slice`
  // / `concat` preserve element types; `reduce` and `reduceRight` bail
  // conservatively since the accumulator could be a node array. `sort`
  // and `reverse` mutate and return the same array. All of these come
  // up when users build lists of nodes in JSX.
  const ARRAY_METHODS = new Set([
    'map',
    'flatMap',
    'filter',
    'flat',
    'concat',
    'slice',
    'reverse',
    'sort',
    'reduce',
    'reduceRight',
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
      // Tail-dynamic optimisation: if this is the only child of its parent,
      // skip the comment marker and let the walker emit `_insert` with no
      // marker (appendChild semantics). Saves one comment node per slot.
      // Only safe as the sole child - with preceding static siblings, the
      // hydration cursor (which `markerIndex(parent, undefined) → 0`)
      // would adopt the first static child instead of the SSR slot.
      if (parent && parent.children.length === 1) {
        return '';
      }
      return '<!>';
    }
    if (plan.kind === 'node') {
      if (parent && parent.children.length === 1) {
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
    // Only safe to skip the marker when the dynamic is the sole child.
    // With preceding static siblings, hydration's marker-less cursor
    // starts at parent.childNodes[0] (the static sibling) and adopts
    // the wrong slot. Keeping this in sync with `emitTemplateHTML`'s
    // tail check is critical - if the template emits a `<!>` here but
    // the walker thinks it's tail, the marker becomes orphaned.
    if (plan.children.length !== 1 || i !== 0) return false;
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
      if (DELEGATED_EVENTS.has(op.eventName)) {
        addRuntimeImport(state, '_delegate');
        stmts.push(t.expressionStatement(
          t.callExpression(t.identifier('_delegate'), [
            targetId, t.stringLiteral(op.eventName), op.expr,
          ])
        ));
      } else {
        stmts.push(t.expressionStatement(
          t.callExpression(
            t.memberExpression(targetId, t.identifier('addEventListener')),
            [t.stringLiteral(op.eventName), op.expr]
          )
        ));
      }
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
      // Wrap component / fragment insertions in an arrow so `_insert`'s
      // function-accessor path evaluates them AFTER it has pushed a
      // hydration frame for the target parent. If we pass the raw node
      // expression, `_createComponent` runs before `_insert` — its
      // internal `cloneNode` then adopts from whatever outer frame was
      // active, which can grab the wrong SSR node and leave the real
      // children as dead orphans. Adds a disposed-immediately
      // renderEffect (no tracked sources → auto-dispose), negligible
      // overhead.
      addReactivityImport(state, 'renderEffect');
      valueArg = t.arrowFunctionExpression([], child.expr);
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
      //
      // For bare Identifiers we can't tell at compile time whether the binding
      // holds a signal getter (function) or a plain value, so we wrap with a
      // runtime typeof-function call — mirroring `_insert`'s auto-unwrap.
      // Without this, `<p>{count}</p>` would assign the getter itself to
      // `.data`, which stringifies to the function's source text.
      const dataValue = t.isIdentifier(child.expr)
        ? t.conditionalExpression(
            t.binaryExpression(
              '===',
              t.unaryExpression('typeof', t.cloneNode(child.expr)),
              t.stringLiteral('function'),
            ),
            t.callExpression(t.cloneNode(child.expr), []),
            t.cloneNode(child.expr),
          )
        : child.expr;
      const assign = t.assignmentExpression(
        '=',
        t.memberExpression(textId, t.identifier('data')),
        t.logicalExpression('??', dataValue, t.stringLiteral('')),
      );
      // Identifier exprs force the reactive wrap: if the binding *is* a
      // signal getter, the typeof-guarded call inside renderEffect subscribes
      // to it so `.data` tracks changes. For non-signal values renderEffect
      // just runs once — cheap and correct.
      const wrapInEffect = child.reactive || t.isIdentifier(child.expr);
      if (wrapInEffect) {
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

    // Capture every child ref before emitting operations that may insert or
    // adopt nodes. This matters during hydration: component slots are real SSR
    // nodes instead of comment markers, so the first `_insert(...)` can shift
    // the sibling chain the next slot would otherwise walk.
    const childRefs = new Map<number, BabelTypes.Identifier>();
    let tplIdx = 0;

    for (let i = 0; i < plan.children.length; i++) {
      const child = plan.children[i];
      const tail = isTailDynamic(plan, i);

      if (tail) {
        // Emitted with no marker — no walk ref, no tplIdx bump (not in HTML).
        continue;
      }

      const myTplIdx = tplIdx++;

      if (!needsWalking(child)) continue;

      const childId = mkUid();
      let navExpr: BabelTypes.Expression = t.memberExpression(
        elementId,
        t.identifier('firstChild'),
      );
      for (let j = 0; j < myTplIdx; j++) {
        navExpr = t.memberExpression(navExpr, t.identifier('nextSibling'));
      }
      stmts.push(t.variableDeclaration('const', [
        t.variableDeclarator(childId, navExpr),
      ]));
      childRefs.set(i, childId);
    }

    for (let i = 0; i < plan.children.length; i++) {
      const child = plan.children[i];
      const tail = isTailDynamic(plan, i);

      if (tail) {
        emitChildInsert(elementId, null, child, state, stmts);
        continue;
      }

      const childId = childRefs.get(i);
      if (!childId) continue;
      if (child.kind === 'element') {
        walkAndEmit(child, childId, state, stmts, mkUid);
      } else {
        emitChildInsert(elementId, childId, child, state, stmts);
      }
    }
  }

  function transformNativeElement(
    node: BabelTypes.JSXElement,
    state: PluginState,
    scope?: Scope,
  ): BabelTypes.Expression {
    const plan = buildElementPlan(node, state, scope);
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
    state: PluginState,
    scope?: Scope,
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

      if (isPotentiallyReactive(value, scope)) {
        // Both identifier and string-literal keys can host a getter.
        // Without this, dashed names like `aria-label` and `data-id`
        // were emitted as eager properties that snapshot the value at
        // setup time - subsequent signal updates never reached the
        // component's prop reads.
        propsProperties.push(
          t.objectMethod(
            'get',
            keyNode,
            [],
            t.blockStatement([t.returnStatement(value)])
          ) as any
        );
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
            childExprs.push(transformComponent(child, state, scope));
          } else {
            childExprs.push(transformNativeElement(child, state, scope));
          }
        } else if (t.isJSXFragment(child)) {
          childExprs.push(transformFragment(child, state, scope));
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
    state: PluginState,
    scope?: Scope,
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
          childExprs.push(transformComponent(child, state, scope));
        } else {
          childExprs.push(transformNativeElement(child, state, scope));
        }
      } else if (t.isJSXFragment(child)) {
        childExprs.push(transformFragment(child, state, scope));
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
            ? transformComponent(node, state, path.scope)
            : transformNativeElement(node, state, path.scope);
          path.replaceWith(result);
        },
      },

      JSXFragment: {
        enter(path, state) {
          if (path.findParent((p) => t.isJSXElement(p.node) || t.isJSXFragment(p.node))) {
            return;
          }
          path.replaceWith(transformFragment(path.node, state, path.scope));
        },
      },

      CallExpression: {
        enter(path) {
          if (!canAutoStaticShow(path.node, path.scope)) return;
          if (path.node.arguments.length === 2) {
            path.node.arguments.push(t.identifier('undefined'));
          }
          path.node.arguments.push(t.objectExpression([
            t.objectProperty(t.identifier('static'), t.booleanLiteral(true)),
          ]));
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
