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

export class Scope {
  /** Unique numeric ID for devtools. */
  id: number;
  /**
   * Optional label (e.g., the component name) for devtools. Set by
   * `_createComponent` for every component scope so signals/effects
   * created inside can be attributed back to their owning component.
   */
  label?: string;
  children: (Disposable | Scope)[] = [];
  cleanups: (() => void)[] = [];
  parent: Scope | null;
  disposed = false;
  /**
   * Per-scope provide/inject map. Lazily allocated — most scopes never
   * call `provide()`, so defer the Map construction until first write.
   * Reads go through `getContext`/`hasContext` to avoid allocating.
   */
  contexts: Map<symbol, unknown> | null = null;

  constructor(parent: Scope | null) {
    this.id = nextScopeId++;
    this.parent = parent;
    parent?.children.push(this);
  }

  addChild(node: Disposable | Scope): void {
    this.children.push(node);
  }

  addCleanup(fn: () => void): void {
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
    this.children = [];

    // Run cleanup functions
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
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
