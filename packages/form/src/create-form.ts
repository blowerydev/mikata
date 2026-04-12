import { signal, computed, batch, untrack, effect } from '@mikata/reactivity';
import type {
  FormError,
  FormErrors,
  FormOptions,
  GetInputPropsOptions,
  InputProps,
  MikataForm,
} from './types';
import { deepClone } from './utils/deep-clone';
import { deepEqual } from './utils/deep-equal';
import { getPath } from './utils/get-path';
import { setPath } from './utils/set-path';
import { runValidator, validateSingleField } from './validate';

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
  } = options;

  const [initialSnapshot, setInitialSnapshot] = signal<Values>(deepClone(initialValues));
  const [valuesSignal, setValuesSignal] = signal<Values>(deepClone(initialValues));
  const [errorsSignal, setErrorsSignal] = signal<FormErrors>({});
  const [touchedSignal, setTouchedSignal] = signal<Record<string, boolean>>({});
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

  function setFieldValue(path: string, value: unknown): void {
    batch(() => {
      setValuesSignal(setPath(valuesSignal(), path, value));
      if (clearInputErrorOnChange) clearFieldError(path);
      if (validateInputOnChange) {
        const err = validateSingleField(validatorSpec, valuesSignal(), path);
        if (err) setFieldError(path, err);
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
    const err = validateSingleField(validatorSpec, valuesSignal(), path);
    if (err) {
      setFieldError(path, err);
      return { hasError: true, error: err };
    }
    clearFieldError(path);
    return { hasError: false, error: null };
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
    const error = withError ? errorsSignal()[path] : undefined;

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
        const err = validateSingleField(validatorSpec, valuesSignal(), path);
        if (err) setFieldError(path, err);
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

    if (withError && error != null) {
      props.error = error;
      props['aria-invalid'] = true;
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
   * Built on top of signals via a lightweight polling effect — for heavier use
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
    getInputProps,
    insertListItem,
    removeListItem,
    reorderListItem,
    replaceListItem,
    onSubmit,
    onReset,
    getTransformedValues,
    watch,
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
