let counter = 0;

/**
 * Generate a unique ID for ARIA relationships.
 * Each call returns a new unique string.
 */
export function useId(prefix: string = 'mkt'): string {
  return `${prefix}-${++counter}`;
}

/** Reset counter — only for tests. */
export function _resetIdCounter(): void {
  counter = 0;
}
