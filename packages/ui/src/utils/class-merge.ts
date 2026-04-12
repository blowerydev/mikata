/**
 * Merge multiple class name strings, filtering out falsy values.
 *
 * Usage:
 *   mergeClasses('mkt-button', props.fullWidth && 'mkt-button--full-width', props.class)
 */
export function mergeClasses(
  ...inputs: (string | false | null | undefined)[]
): string {
  return inputs.filter(Boolean).join(' ');
}
