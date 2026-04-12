import type { FieldValidator, FormError, FormErrors, ValidatorObject } from '../types';
import { getPath } from './get-path';

/**
 * Walk a nested validator object against the values tree and run every leaf
 * validator, producing a flat FormErrors map. Array leaves in the values are
 * iterated — the spec for an array field is applied to every element.
 */
export function runValidatorObject<Values>(
  spec: ValidatorObject<Values>,
  values: Values
): FormErrors {
  const errors: FormErrors = {};
  walk(spec, values, values, '', errors);
  return errors;
}

function walk<Values>(
  spec: ValidatorObject<Values> | FieldValidator<Values>,
  node: unknown,
  rootValues: Values,
  pathPrefix: string,
  errors: FormErrors
): void {
  if (typeof spec === 'function') {
    const result = spec(node, rootValues, pathPrefix);
    if (result != null && result !== false) {
      errors[pathPrefix] = result as FormError;
    }
    return;
  }

  // spec is an object; node should be an object or array
  if (Array.isArray(node)) {
    // Array: if spec has numeric keys (rare) use per-index; otherwise treat the
    // whole spec as the element-shape and apply it to every index.
    for (let i = 0; i < node.length; i++) {
      const elPath = pathPrefix ? `${pathPrefix}.${i}` : String(i);
      walk(spec as ValidatorObject<Values>, node[i], rootValues, elPath, errors);
    }
    return;
  }

  if (node == null || typeof node !== 'object') {
    // Spec expects nested structure but value is primitive/undefined — skip.
    return;
  }

  for (const key of Object.keys(spec)) {
    const childSpec = (spec as Record<string, unknown>)[key] as
      | ValidatorObject<Values>
      | FieldValidator<Values>;
    const childPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    const childValue = getPath(rootValues, childPath);
    walk(childSpec, childValue, rootValues, childPath, errors);
  }
}
