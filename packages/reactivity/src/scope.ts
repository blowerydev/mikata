/**
 * Reactive scopes for automatic disposal.
 *
 * Every component gets its own scope. When a component is removed,
 * its scope is disposed, cleaning up all effects and child scopes.
 */

import type { ReactiveNode } from './tracking';

export interface Disposable {
  _dispose(): void;
}

export class Scope {
  children: (Disposable | Scope)[] = [];
  cleanups: (() => void)[] = [];
  parent: Scope | null;
  disposed = false;
  contexts: Map<symbol, unknown> = new Map();

  constructor(parent: Scope | null) {
    this.parent = parent;
    parent?.children.push(this);
  }

  addChild(node: Disposable | Scope): void {
    this.children.push(node);
  }

  addCleanup(fn: () => void): void {
    this.cleanups.push(fn);
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
  }
}
