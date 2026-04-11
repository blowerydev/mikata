/**
 * Context — provide/inject pattern for passing data through
 * the component tree without prop drilling.
 */

import { getCurrentScope } from '@mikata/reactivity';

export interface Context<T> {
  readonly id: symbol;
  readonly defaultValue: T | undefined;
}

/**
 * Create a named context with an optional default value.
 *
 * Usage:
 *   const ThemeContext = createContext<'light' | 'dark'>('light');
 */
export function createContext<T>(defaultValue?: T): Context<T> {
  return {
    id: Symbol(__DEV__ ? 'mikata:context' : ''),
    defaultValue,
  };
}

/**
 * Provide a value for a context in the current component scope.
 * All descendant components can inject this value.
 *
 * Usage:
 *   provide(ThemeContext, 'dark');
 */
export function provide<T>(context: Context<T>, value: T): void {
  const scope = getCurrentScope();
  if (!scope) {
    throw new Error(
      '[mikata] provide() must be called inside a component setup function.'
    );
  }
  scope.contexts.set(context.id, value);
}

/**
 * Inject a value from the nearest ancestor that provides this context.
 * Falls back to the context's default value if no provider is found.
 *
 * Usage:
 *   const theme = inject(ThemeContext); // 'dark'
 */
export function inject<T>(context: Context<T>): T {
  let scope = getCurrentScope();

  while (scope) {
    if (scope.contexts.has(context.id)) {
      return scope.contexts.get(context.id) as T;
    }
    scope = scope.parent;
  }

  if (context.defaultValue !== undefined) {
    return context.defaultValue;
  }

  throw new Error(
    `[mikata] inject() called but no provider found for context. ` +
    `Make sure a parent component calls provide().`
  );
}

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean;
