import type { FormError, FormErrors, ValidatorSpec, ValidatorObject } from './types';
import { runValidatorObject } from './utils/flatten-spec';
import { getPath } from './utils/get-path';

export function isThenable(v: unknown): v is PromiseLike<unknown> {
  return !!v && (typeof v === 'object' || typeof v === 'function') &&
    typeof (v as { then?: unknown }).then === 'function';
}

/**
 * Run the full validator spec against the values, returning a flat FormErrors
 * map. Any fields whose validators return a Promise are skipped here - async
 * validators are handled per-field via `validateSingleFieldMaybeAsync`.
 */
export function runValidator<Values>(
  spec: ValidatorSpec<Values> | undefined,
  values: Values
): FormErrors {
  if (!spec) return {};
  if (typeof spec === 'function') {
    return spec(values) ?? {};
  }
  const raw = runValidatorObject(spec as ValidatorObject<Values>, values);
  // Drop pending Promise entries so full-form validate() stays synchronous.
  const out: FormErrors = {};
  for (const key of Object.keys(raw)) {
    const v = raw[key] as unknown;
    if (!isThenable(v)) out[key] = raw[key];
  }
  return out;
}

/**
 * Validate a single field. For object-spec: walks to the field's validator and
 * runs only that leaf. For function/resolver: runs the whole validator and
 * extracts the single path.
 *
 * Synchronous overload - drops Promise returns (the async pipeline in
 * create-form handles those directly). Use `validateSingleFieldMaybeAsync`
 * when you need to distinguish sync vs async.
 */
export function validateSingleField<Values>(
  spec: ValidatorSpec<Values> | undefined,
  values: Values,
  path: string
): FormError | null {
  const raw = validateSingleFieldMaybeAsync(spec, values, path);
  if (isThenable(raw)) return null;
  return raw;
}

/**
 * Like `validateSingleField` but preserves Promise returns so the caller can
 * await them. Callers are responsible for token-based cancellation.
 */
export function validateSingleFieldMaybeAsync<Values>(
  spec: ValidatorSpec<Values> | undefined,
  values: Values,
  path: string
): FormError | null | Promise<FormError | null | undefined> {
  if (!spec) return null;

  if (typeof spec === 'function') {
    const all = spec(values) ?? {};
    return (all[path] ?? null) as FormError | null;
  }

  // Object spec: locate the leaf validator for this path, handling array
  // element specs (where the spec has no numeric key but applies to each item).
  const leaf = findValidatorForPath(spec as ValidatorObject<Values>, path, values);
  if (!leaf) return null;
  const value = getPath(values, path);
  const result = leaf(value, values, path);
  if (isThenable(result)) {
    return Promise.resolve(result).then((r) =>
      r != null && (r as unknown) !== false ? (r as FormError) : null,
    );
  }
  return result != null && (result as unknown) !== false ? (result as FormError) : null;
}

function findValidatorForPath<Values>(
  spec: ValidatorObject<Values>,
  path: string,
  values: Values
): ((v: unknown, vs: Values, p: string) => unknown) | null {
  const parts = path.split('.');
  let cur: unknown = spec;
  let curValue: unknown = values;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    if (cur == null) return null;
    if (typeof cur === 'function') {
      return cur as (v: unknown, vs: Values, p: string) => unknown;
    }
    // If the CURRENT VALUE at this prefix is an array and the key is numeric,
    // the spec doesn't descend by index - the whole spec already represents
    // the element shape, so keep `cur` as-is and advance curValue.
    if (Array.isArray(curValue) && /^\d+$/.test(key)) {
      curValue = (curValue as unknown[])[Number(key)];
      continue;
    }
    cur = (cur as Record<string, unknown>)[key];
    curValue = curValue != null ? (curValue as Record<string, unknown>)[key] : undefined;
  }
  return typeof cur === 'function' ? (cur as (v: unknown, vs: Values, p: string) => unknown) : null;
}
