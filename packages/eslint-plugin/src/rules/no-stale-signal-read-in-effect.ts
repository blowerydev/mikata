import type { Rule } from 'eslint';
import type {
  CallExpression,
  Identifier,
  Node,
  Pattern,
  VariableDeclarator,
} from 'estree';

const SIGNAL_CREATORS = new Set([
  'signal',
  'computed',
  'derived',
  'createDerivedSignal',
  'createMemo',
]);

const REACTIVE_WRAPPERS = new Set(['effect', 'renderEffect', 'computed']);

type CaptureInfo = {
  /** Name of the signal getter that was called. */
  source: string;
  /** Source range of the declarator node (for "is inside callback?" checks). */
  range: [number, number];
};

/**
 * Flags reading a signal getter into a local variable outside a reactive
 * context, then referencing that variable inside `effect()` / `renderEffect()`
 * / `computed()`. The captured value is a one-time snapshot — the reactive
 * wrapper never re-runs when the underlying signal changes.
 *
 * ```ts
 * const [schemaLoading] = signal(true);
 *
 * // ❌ Captured outside any reactive context — value is frozen.
 * const loading = schemaLoading();
 * effect(() => {
 *   if (loading) return;  // never updates when schemaLoading changes
 *   doWork();
 * });
 *
 * // ✅ Read inside the effect so the dependency is tracked.
 * effect(() => {
 *   if (schemaLoading()) return;
 *   doWork();
 * });
 * ```
 *
 * Scope: syntactic only. Tracks signal getters declared in the same file and
 * captures bound to them via `const x = getter()`. Only flags references
 * inside `effect`/`renderEffect`/`computed` callback bodies when the capture
 * was declared outside that callback. Does not analyze cross-file signals,
 * aliased getters, or signals stored on objects.
 */
export const noStaleSignalReadInEffect: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Do not capture a signal value outside a reactive context and use it inside effect/renderEffect/computed — it will be stale.',
      recommended: true,
    },
    schema: [],
    messages: {
      stale:
        'Identifier `{{capture}}` is a one-time snapshot of signal `{{source}}` — reading it inside `{{wrapper}}(...)` will not track updates. Call `{{source}}()` directly inside the callback instead.',
    },
  },

  create(context) {
    const signalScopes: Array<Map<string, boolean>> = [];
    /** identifier name → capture info (last write wins on shadowing). */
    const captureScopes: Array<Map<string, CaptureInfo | null>> = [];

    function enterScope(): void {
      signalScopes.push(new Map());
      captureScopes.push(new Map());
    }

    function exitScope(): void {
      signalScopes.pop();
      captureScopes.pop();
    }

    function declare(name: string, isSignal: boolean, capture: CaptureInfo | null = null): void {
      signalScopes[signalScopes.length - 1].set(name, isSignal);
      captureScopes[captureScopes.length - 1].set(name, capture);
    }

    function declarePattern(pattern: Pattern, isSignal: boolean, capture: CaptureInfo | null = null): void {
      if (pattern.type === 'Identifier') {
        declare(pattern.name, isSignal, capture);
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
        declarePattern(pattern.left, isSignal, capture);
      } else if (pattern.type === 'RestElement') {
        declarePattern(pattern.argument, isSignal, capture);
      }
    }

    function isSignal(name: string): boolean {
      for (let i = signalScopes.length - 1; i >= 0; i--) {
        const value = signalScopes[i].get(name);
        if (value !== undefined) return value;
      }
      return false;
    }

    function getCapture(name: string): CaptureInfo | null {
      for (let i = captureScopes.length - 1; i >= 0; i--) {
        if (captureScopes[i].has(name)) return captureScopes[i].get(name) ?? null;
      }
      return null;
    }

    function addPatternNames(pattern: Pattern, names: Set<string>): void {
      if (pattern.type === 'Identifier') {
        names.add(pattern.name);
      } else if (pattern.type === 'ArrayPattern') {
        for (const element of pattern.elements) {
          if (element) addPatternNames(element, names);
        }
      } else if (pattern.type === 'ObjectPattern') {
        for (const prop of pattern.properties) {
          if (prop.type === 'Property') addPatternNames(prop.value as Pattern, names);
          if (prop.type === 'RestElement') addPatternNames(prop.argument, names);
        }
      } else if (pattern.type === 'AssignmentPattern') {
        addPatternNames(pattern.left, names);
      } else if (pattern.type === 'RestElement') {
        addPatternNames(pattern.argument, names);
      }
    }

    function isFunctionNode(n: Node): boolean {
      return (
        n.type === 'FunctionDeclaration' ||
        n.type === 'FunctionExpression' ||
        n.type === 'ArrowFunctionExpression'
      );
    }

    return {
      Program: enterScope,
      'Program:exit': exitScope,

      FunctionDeclaration(node) {
        enterScope();
        for (const param of node.params) declarePattern(param, false);
      },
      'FunctionDeclaration:exit': exitScope,
      FunctionExpression(node) {
        enterScope();
        for (const param of node.params) declarePattern(param, false);
      },
      'FunctionExpression:exit': exitScope,
      ArrowFunctionExpression(node) {
        enterScope();
        for (const param of node.params) declarePattern(param, false);
      },
      'ArrowFunctionExpression:exit': exitScope,

      VariableDeclarator(node: VariableDeclarator) {
        const init = node.init;
        if (!init) {
          declarePattern(node.id, false);
          return;
        }

        // Track signal-creator declarations so we know what's a getter.
        if (init.type === 'CallExpression') {
          const callee = init.callee;
          if (callee.type === 'Identifier' && SIGNAL_CREATORS.has(callee.name)) {
            if (node.id.type === 'Identifier') {
              declare(node.id.name, true);
            } else if (node.id.type === 'ArrayPattern') {
              const first = node.id.elements[0];
              if (first && first.type === 'Identifier') declare(first.name, true);
              for (const element of node.id.elements.slice(1)) {
                if (element) declarePattern(element, false);
              }
            }
            return;
          }
        }

        // Track captures: `const x = someSignal()` where someSignal is tracked.
        if (init.type === 'CallExpression') {
          const callee = init.callee;
          if (
            callee.type === 'Identifier' &&
            isSignal(callee.name) &&
            node.id.type === 'Identifier'
          ) {
            const range = (node as Node & { range?: [number, number] }).range;
            if (range) {
              declare(node.id.name, false, { source: callee.name, range });
              return;
            }
          }
        }
        declarePattern(node.id, false);
      },

      CallExpression(node: CallExpression) {
        const callee = node.callee;
        if (callee.type !== 'Identifier') return;
        if (!REACTIVE_WRAPPERS.has(callee.name)) return;

        const cb = node.arguments[0];
        if (!cb) return;
        if (!isFunctionNode(cb as unknown as Node)) return;
        const cbNode = cb as unknown as Node & { range?: [number, number]; body: Node };
        const cbRange = cbNode.range;
        if (!cbRange) return;

        // Walk the callback body; stop at nested function boundaries to avoid
        // reporting inner effects twice.
        const seen = new Set<string>();
        const localNames = new Set<string>();
        for (const param of (cb as unknown as { params: Pattern[] }).params) {
          addPatternNames(param, localNames);
        }
        function visit(n: Node): void {
          if (n !== cbNode.body && isFunctionNode(n)) return;

          if (n.type === 'VariableDeclarator') {
            addPatternNames(n.id, localNames);
          }

          if (n.type === 'Identifier') {
            const id = n as Identifier;
            if (localNames.has(id.name)) return;
            const cap = getCapture(id.name);
            if (cap) {
              // Only flag if the capture declarator is OUTSIDE this callback.
              const [capStart, capEnd] = cap.range;
              const [cbStart, cbEnd] = cbRange;
              const inside = capStart >= cbStart && capEnd <= cbEnd;
              if (!inside && !seen.has(id.name + ':' + (id as Node & { range?: [number, number] }).range?.[0])) {
                seen.add(id.name + ':' + (id as Node & { range?: [number, number] }).range?.[0]);
                context.report({
                  node: id as Node,
                  messageId: 'stale',
                  data: {
                    capture: id.name,
                    source: cap.source,
                    wrapper: (callee as Identifier).name,
                  },
                });
              }
            }
            return;
          }

          // Don't descend into property keys of non-computed member expressions
          // (e.g. `obj.foo` where `foo` isn't a variable reference).
          if (n.type === 'MemberExpression' && !(n as { computed?: boolean }).computed) {
            const obj = (n as unknown as { object: Node }).object;
            if (obj) visit(obj);
            return;
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

        if (cbNode.body) visit(cbNode.body);
      },
    };
  },
};
