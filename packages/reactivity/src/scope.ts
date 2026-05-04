/**
 * Reactive scopes for automatic disposal.
 *
 * Every component gets its own scope. When a component is removed,
 * its scope is disposed, cleaning up all effects and child scopes.
 */

import type { ReactiveNode } from './tracking';
import { notifyOnCleanupCalled } from './leak-detector';

declare const __DEV__: boolean;

export interface Disposable {
  _dispose(): void;
}

let nextScopeId = 1;

const EMPTY_CHILDREN: (Disposable | Scope)[] = [];
const EMPTY_CLEANUPS: (() => void)[] = [];

export class Scope {
  /** Unique numeric ID for devtools. */
  id: number;
  /**
   * Optional label (e.g., the component name) for devtools. Set by
   * `_createComponent` for every component scope so signals/effects
   * created inside can be attributed back to their owning component.
   */
  label?: string;
  children: (Disposable | Scope)[] = EMPTY_CHILDREN;
  cleanups: (() => void)[] = EMPTY_CLEANUPS;
  parent: Scope | null;
  disposed = false;
  /**
   * Per-scope provide/inject map. Lazily allocated — most scopes never
   * call `provide()`, so defer the Map construction until first write.
   * Reads go through `getContext`/`hasContext` to avoid allocating.
   */
  contexts: Map<symbol, unknown> | null = null;

  constructor(parent: Scope | null, attach = true) {
    this.id = nextScopeId++;
    this.parent = parent;
    if (attach) parent?.addChild(this);
  }

  addChild(node: Disposable | Scope): void {
    if (this.children === EMPTY_CHILDREN) this.children = [];
    this.children.push(node);
  }

  addCleanup(fn: () => void): void {
    if (this.cleanups === EMPTY_CLEANUPS) this.cleanups = [];
    this.cleanups.push(fn);
  }

  setContext(key: symbol, value: unknown): void {
    (this.contexts ??= new Map()).set(key, value);
  }

  getContext(key: symbol): unknown {
    return this.contexts?.get(key);
  }

  hasContext(key: symbol): boolean {
    return this.contexts?.has(key) ?? false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Dispose children first (depth-first)
    for (const child of this.children) {
      if (child instanceof Scope) {
        child.dispose();
      } else {
        child._dispose();
      }
    }
    this.children = EMPTY_CHILDREN;

    // Run cleanup functions
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = EMPTY_CLEANUPS;

    if (this.parent && !this.parent.disposed) {
      const siblings = this.parent.children;
      if (siblings !== EMPTY_CHILDREN) {
        const index = siblings.indexOf(this);
        if (index >= 0) siblings.splice(index, 1);
      }
    }
    this.parent = null;
  }
}

let currentScope: Scope | null = null;

export function getCurrentScope(): Scope | null {
  return currentScope;
}

export function setCurrentScope(scope: Scope | null): Scope | null {
  const prev = currentScope;
  currentScope = scope;
  return prev;
}

/**
 * Create a new reactive scope. All effects and child scopes created
 * inside `fn` will be owned by the new scope.
 */
export function createScope(fn: () => void): Scope {
  const scope = new Scope(currentScope);
  const prev = currentScope;
  currentScope = scope;
  try {
    fn();
  } finally {
    currentScope = prev;
  }
  return scope;
}

/**
 * Create a scope only if work inside actually registers disposable state.
 *
 * Runtime control-flow helpers use this for branches that are often just
 * static DOM. Descendant effects/scopes still see a real current scope while
 * rendering; if nothing subscribes or registers cleanup, we avoid linking an
 * empty scope into the owner tree and disposal becomes a no-op.
 */
export function createLazyScope(fn: () => void): Scope | null {
  const parent = currentScope;
  const scope = new Scope(parent, false);
  const prev = currentScope;
  currentScope = scope;
  try {
    fn();
  } finally {
    currentScope = prev;
  }

  if (
    scope.children.length === 0 &&
    scope.cleanups.length === 0 &&
    scope.contexts === null
  ) {
    scope.parent = null;
    return null;
  }

  if (parent && !parent.disposed) parent.addChild(scope);
  return scope;
}

/**
 * Register a cleanup function on the current scope.
 * Called when the scope is disposed (e.g., component unmounted).
 */
export function onCleanup(fn: () => void): void {
  if (currentScope) {
    currentScope.addCleanup(fn);
  } else if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      '[mikata] onCleanup() was called outside a reactive scope. ' +
      'The cleanup will not run; call it during component setup, effect(), or createScope().'
    );
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    notifyOnCleanupCalled();
  }
}
