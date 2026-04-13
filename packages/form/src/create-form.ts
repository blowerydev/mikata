import { signal, computed, batch, untrack, effect } from '@mikata/reactivity';
import type {
  FieldArrayHandle,
  FormError,
  FormErrors,
  FormOptions,
  FormScope,
  GetInputPropsOptions,
  InputProps,
  MikataForm,
} from './types';
import { createFieldArray } from './field-array';
import { deepClone } from './utils/deep-clone';
import { deepEqual } from './utils/deep-equal';
import { getPath } from './utils/get-path';
import { setPath } from './utils/set-path';
import {
  isThenable,
  runValidator,
  validateSingleFieldMaybeAsync,
} from './validate';

/**
 * Create a reactive form handle. Setup-once: call `createForm({...})` inside a
 * component body, store the returned handle, and use it for the component's
 * lifetime. Field reads through `form.values` and `form.errors` track at the
 * leaf so consumers re-run only when the fields they read change.
 */
export function createForm<Values extends object>(
  options: FormOptions<Values>
): MikataForm<Values> {
  const {
    initialValues,
    validate: validatorSpec,
    validateInputOnChange = false,
    validateInputOnBlur = false,
    clearInputErrorOnChange = true,
    transformValues,
    enhance,
    asyncDebounceMs = 0,
  } = options;

  const [initialSnapshot, setInitialSnapshot] = signal<Values>(deepClone(initialValues));
  const [valuesSignal, setValuesSignal] = signal<Values>(deepClone(initialValues));
  const [errorsSignal, setErrorsSignal] = signal<FormErrors>({});
  const [touchedSignal, setTouchedSignal] = signal<Record<string, boolean>>({});
  const [validatingSignal, setValidatingSignal] = signal<Record<string, boolean>>({});
  // Per-path monotonic token - every new async run increments it, stale
  // resolutions compare their captured token against the current and bail if
  // they've been superseded.
  const validationTokens = new Map<string, number>();
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // Field refs for focusing the first invalid field on submit failure.
  const fieldRefs = new Map<string, HTMLElement>();

  const isDirtyComputed = computed(() => !deepEqual(initialSnapshot(), valuesSignal()));
  const isValidComputed = computed(() => Object.keys(errorsSignal()).length === 0);

  function getValues(): Values {
    return valuesSignal();
  }

  function getValue(path: string): unknown {
    return getPath(valuesSignal(), path);
  }

  function setPathValidating(path: string, pending: boolean): void {
    const cur = validatingSignal();
    const already = !!cur[path];
    if (already === pending) return;
    const next = { ...cur };
    if (pending) next[path] = true;
    else delete next[path];
    setValidatingSignal(next);
  }

  function runFieldValidation(path: string): void {
    const raw = validateSingleFieldMaybeAsync(validatorSpec, valuesSignal(), path);
    if (isThenable(raw)) {
      const token = (validationTokens.get(path) ?? 0) + 1;
      validationTokens.set(path, token);
      setPathValidating(path, true);
      raw.then(
        (result) => {
          if (validationTokens.get(path) !== token) return;
          if (result) setFieldError(path, result as FormError);
          else clearFieldError(path);
          setPathValidating(path, false);
        },
        (err) => {
          if (validationTokens.get(path) !== token) return;
          setPathValidating(path, false);
          // Surface unexpected rejections; users who want to swallow should
          // catch inside the validator itself.
          if (typeof console !== 'undefined') {
            console.error(`[mikata/form] async validator for "${path}" rejected:`, err);
          }
        },
      );
    } else if (raw) {
      setFieldError(path, raw);
    }
  }

  function scheduleFieldValidation(path: string): void {
    if (asyncDebounceMs > 0) {
      const prev = debounceTimers.get(path);
      if (prev) clearTimeout(prev);
      // Bump the token pre-emptively so any in-flight run whose timer has
      // already fired discards its result when the debounced call lands.
      validationTokens.set(path, (validationTokens.get(path) ?? 0) + 1);
      const timer = setTimeout(() => {
        debounceTimers.delete(path);
        runFieldValidation(path);
      }, asyncDebounceMs);
      debounceTimers.set(path, timer);
    } else {
      runFieldValidation(path);
    }
  }

  function setFieldValue(path: string, value: unknown): void {
    batch(() => {
      setValuesSignal(setPath(valuesSignal(), path, value));
      if (clearInputErrorOnChange) clearFieldError(path);
      if (validateInputOnChange) {
        scheduleFieldValidation(path);
      }
    });
  }

  function setValues(next: Partial<Values> | ((prev: Values) => Values)): void {
    batch(() => {
      if (typeof next === 'function') {
        setValuesSignal(next(valuesSignal()));
      } else {
        setValuesSignal({ ...valuesSignal(), ...next } as Values);
      }
    });
  }

  function reset(): void {
    batch(() => {
      setValuesSignal(deepClone(initialSnapshot()));
      setErrorsSignal({});
      setTouchedSignal({});
    });
  }

  function initialize(values: Values): void {
    batch(() => {
      const cloned = deepClone(values);
      setInitialSnapshot(cloned);
      setValuesSignal(deepClone(cloned));
      setErrorsSignal({});
      setTouchedSignal({});
    });
  }

  function setErrors(errors: FormErrors): void {
    setErrorsSignal({ ...errors });
  }

  function setFieldError(path: string, error: FormError): void {
    setErrorsSignal({ ...errorsSignal(), [path]: error });
  }

  function clearErrors(): void {
    setErrorsSignal({});
  }

  function clearFieldError(path: string): void {
    const cur = errorsSignal();
    if (!(path in cur)) return;
    const next = { ...cur };
    delete next[path];
    setErrorsSignal(next);
  }

  function validate(): { hasErrors: boolean; errors: FormErrors } {
    const errors = runValidator(validatorSpec, valuesSignal());
    setErrorsSignal(errors);
    return { hasErrors: Object.keys(errors).length > 0, errors };
  }

  function validateField(path: string): { hasError: boolean; error: FormError | null } {
    const raw = validateSingleFieldMaybeAsync(validatorSpec, valuesSignal(), path);
    if (isThenable(raw)) {
      // Kick off the async path so the result lands eventually.
      runFieldValidation(path);
      // Return the current known state; the async result will update errors
      // when it resolves.
      const existing = errorsSignal()[path] ?? null;
      return { hasError: !!existing, error: (existing as FormError) ?? null };
    }
    if (raw) {
      setFieldError(path, raw);
      return { hasError: true, error: raw };
    }
    clearFieldError(path);
    return { hasError: false, error: null };
  }

  function isValidating(path?: string): boolean {
    const map = validatingSignal();
    if (path == null) return Object.keys(map).length > 0;
    return !!map[path];
  }

  function isDirty(path?: string): boolean {
    if (path == null) return isDirtyComputed();
    return !deepEqual(getPath(initialSnapshot(), path), getPath(valuesSignal(), path));
  }

  function isTouched(path?: string): boolean {
    const t = touchedSignal();
    if (path == null) return Object.values(t).some(Boolean);
    return !!t[path];
  }

  function getTouched(): Record<string, boolean> {
    return { ...touchedSignal() };
  }

  function getDirty(): Record<string, boolean> {
    const init = initialSnapshot();
    const cur = valuesSignal();
    const result: Record<string, boolean> = {};
    walkDirty(init, cur, '', result);
    return result;
  }

  function resetTouched(): void {
    setTouchedSignal({});
  }

  function resetDirty(): void {
    setInitialSnapshot(deepClone(valuesSignal()));
  }

  function markTouched(path: string): void {
    const cur = touchedSignal();
    if (cur[path]) return;
    setTouchedSignal({ ...cur, [path]: true });
  }

  function getInputProps(path: string, opts: GetInputPropsOptions = {}): InputProps {
    const type = opts.type ?? 'input';
    const withError = opts.withError ?? true;
    const withFocus = opts.withFocus ?? true;

    const value = getPath(valuesSignal(), path);

    const onChange = (eventOrValue: unknown): void => {
      let nextValue: unknown;
      if (
        eventOrValue != null &&
        typeof eventOrValue === 'object' &&
        'target' in eventOrValue
      ) {
        const target = (eventOrValue as { target: HTMLInputElement }).target;
        nextValue = type === 'checkbox' ? target.checked : target.value;
      } else {
        nextValue = eventOrValue;
      }
      setFieldValue(path, nextValue);
    };

    const onBlur = (): void => {
      markTouched(path);
      if (validateInputOnBlur) {
        // Blur bypasses debounce - commit-time signals should feel immediate.
        runFieldValidation(path);
      }
    };

    const props: InputProps = {
      onChange,
      onBlur,
    };

    if (type === 'checkbox') {
      props.checked = !!value;
    } else {
      props.value = value;
      // Mikata UI inputs use `onInput` for live updates (following DOM
      // conventions); `onChange` fires on blur. Emit both so the spread works
      // whether the target treats onChange as input (React-style) or change.
      props.onInput = onChange;
    }

    if (withError) {
      props.error = () => errorsSignal()[path];
    }

    if (withFocus) {
      props.ref = (el: HTMLElement | null) => {
        if (el) fieldRefs.set(path, el);
        else fieldRefs.delete(path);
      };
    }

    return props;
  }

  // ── Array helpers ────────────────────────────────
  function insertListItem(path: string, item: unknown, index?: number): void {
    batch(() => {
      const list = (getPath(valuesSignal(), path) as unknown[] | undefined) ?? [];
      const next = list.slice();
      if (index == null || index >= next.length) next.push(item);
      else next.splice(index, 0, item);
      setValuesSignal(setPath(valuesSignal(), path, next));
    });
  }

  function removeListItem(path: string, index: number): void {
    batch(() => {
      const list = (getPath(valuesSignal(), path) as unknown[] | undefined) ?? [];
      const next = list.slice();
      next.splice(index, 1);
      setValuesSignal(setPath(valuesSignal(), path, next));
      // Shift errors/touched for following indices.
      shiftPathMap(path, index, -1, errorsSignal(), setErrorsSignal);
      shiftPathMap(path, index, -1, touchedSignal(), setTouchedSignal);
    });
  }

  function reorderListItem(path: string, { from, to }: { from: number; to: number }): void {
    batch(() => {
      const list = (getPath(valuesSignal(), path) as unknown[] | undefined) ?? [];
      if (from === to) return;
      const next = list.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      setValuesSignal(setPath(valuesSignal(), path, next));
    });
  }

  function replaceListItem(path: string, index: number, item: unknown): void {
    batch(() => {
      const list = (getPath(valuesSignal(), path) as unknown[] | undefined) ?? [];
      const next = list.slice();
      next[index] = item;
      setValuesSignal(setPath(valuesSignal(), path, next));
    });
  }

  // ── Submit / reset ───────────────────────────────
  function onSubmit(
    onValid: (values: Values, event: Event) => void,
    onInvalid?: (errors: FormErrors, event: Event) => void
  ): (event: Event) => void {
    return (event: Event) => {
      event.preventDefault();
      const { hasErrors, errors } = validate();
      if (hasErrors) {
        // Mark all errored fields as touched so error UI shows immediately.
        setTouchedSignal({
          ...touchedSignal(),
          ...Object.fromEntries(Object.keys(errors).map((k) => [k, true])),
        });
        // Focus the first invalid field that registered a ref.
        for (const key of Object.keys(errors)) {
          const el = fieldRefs.get(key);
          if (el) {
            const focusable = findFocusable(el);
            focusable?.focus();
            break;
          }
        }
        onInvalid?.(errors, event);
        return;
      }
      onValid(untrack(() => valuesSignal()), event);
    };
  }

  function onReset(handler?: (event: Event) => void): (event: Event) => void {
    return (event: Event) => {
      event.preventDefault();
      reset();
      handler?.(event);
    };
  }

  function getTransformedValues(): unknown {
    return transformValues ? transformValues(valuesSignal()) : valuesSignal();
  }

  /**
   * Subscribe to changes of a single field. Returns an unsubscribe function.
   * Built on top of signals via a lightweight polling effect - for heavier use
   * callers can just read `form.values.field` inside their own `effect(...)`.
   */
  function watch(path: string, callback: (value: unknown) => void): () => void {
    let last = untrack(() => getPath(valuesSignal(), path));
    let primed = false;
    const dispose = effect(() => {
      const cur = getPath(valuesSignal(), path);
      if (!primed) {
        primed = true;
        last = cur;
        return;
      }
      if (!deepEqual(cur, last)) {
        last = cur;
        callback(cur);
      }
    });
    return dispose as unknown as () => void;
  }

  function scope(scopePath: string): FormScope {
    const prefix = scopePath ? `${scopePath}.` : '';
    const join = (sub: string): string =>
      sub ? (prefix ? `${prefix}${sub}` : sub) : scopePath;

    return {
      path: scopePath,
      getInputProps: (path, opts) => getInputProps(join(path), opts),
      setFieldValue: (path, value) => setFieldValue(join(path), value),
      getValue: (path) => getPath(valuesSignal(), join(path)),
      errors: () => {
        const all = errorsSignal();
        if (!prefix) return { ...all };
        const result: FormErrors = {};
        for (const key of Object.keys(all)) {
          if (key === scopePath) {
            result[''] = all[key];
          } else if (key.startsWith(prefix)) {
            result[key.slice(prefix.length)] = all[key];
          }
        }
        return result;
      },
      insertListItem: (path, item, index) => insertListItem(join(path), item, index),
      removeListItem: (path, index) => removeListItem(join(path), index),
      reorderListItem: (path, range) => reorderListItem(join(path), range),
      replaceListItem: (path, index, item) => replaceListItem(join(path), index, item),
      fieldArray: <T = unknown>(path: string): FieldArrayHandle<T> =>
        createFieldArray<T, Values>(form, join(path)),
      scope: (subPath) => scope(scopePath ? `${scopePath}.${subPath}` : subPath),
    };
  }

  const form: MikataForm<Values> = {
    get values() {
      return valuesSignal();
    },
    getValues,
    getValue,
    setValues,
    setFieldValue,
    reset,
    initialize,
    get errors() {
      return errorsSignal();
    },
    setErrors,
    setFieldError,
    clearErrors,
    clearFieldError,
    isValid: () => isValidComputed(),
    isDirty,
    isTouched,
    getTouched,
    getDirty,
    resetTouched,
    resetDirty,
    validate,
    validateField,
    isValidating,
    getInputProps,
    insertListItem,
    removeListItem,
    reorderListItem,
    replaceListItem,
    fieldArray: <T = unknown>(path: string): FieldArrayHandle<T> =>
      createFieldArray<T, Values>(form, path),
    onSubmit,
    onReset,
    getTransformedValues,
    watch,
    scope,
  };

  enhance?.(form);
  return form;
}

function walkDirty(
  init: unknown,
  cur: unknown,
  path: string,
  out: Record<string, boolean>
): void {
  if (deepEqual(init, cur)) return;
  if (
    init == null ||
    cur == null ||
    typeof init !== 'object' ||
    typeof cur !== 'object' ||
    Array.isArray(init) !== Array.isArray(cur)
  ) {
    if (path) out[path] = true;
    return;
  }
  const keys = new Set([...Object.keys(init as object), ...Object.keys(cur as object)]);
  for (const k of keys) {
    const child = path ? `${path}.${k}` : k;
    walkDirty(
      (init as Record<string, unknown>)[k],
      (cur as Record<string, unknown>)[k],
      child,
      out
    );
  }
}

function shiftPathMap<T>(
  prefix: string,
  fromIndex: number,
  delta: number,
  source: Record<string, T>,
  write: (next: Record<string, T>) => void
): void {
  const result: Record<string, T> = {};
  const rx = new RegExp(`^${escapeRegex(prefix)}\\.(\\d+)(\\..*)?$`);
  let changed = false;
  for (const key of Object.keys(source)) {
    const m = key.match(rx);
    if (!m) {
      result[key] = source[key];
      continue;
    }
    const idx = Number(m[1]);
    const rest = m[2] ?? '';
    if (idx < fromIndex) {
      result[key] = source[key];
    } else if (idx === fromIndex && delta < 0) {
      changed = true;
      // dropped
    } else {
      const newKey = `${prefix}.${idx + delta}${rest}`;
      result[newKey] = source[key];
      if (newKey !== key) changed = true;
    }
  }
  if (changed) write(result);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findFocusable(root: HTMLElement): HTMLElement | null {
  const selector =
    'input, textarea, select, button, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  if (root.matches(selector)) return root;
  return root.querySelector(selector) as HTMLElement | null;
}
