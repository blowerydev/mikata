/**
 * A form error is either a string or a DOM Node. The Node form lets users pass
 * `t.node('errors.key')` from @mikata/i18n for reactive translated errors that
 * update on locale change without re-validating.
 */
export type FormError = string | Node;

/**
 * Flat map of dotted paths to errors (e.g. `{ 'address.city': 'Required' }`).
 */
export type FormErrors = Record<string, FormError>;

/**
 * A single-field validator. Receives the field's current value, the full
 * values snapshot, and the dotted path. Return `null`/`undefined` for valid,
 * or a `FormError`.
 *
 * Async: return a `Promise` to validate against remote state (e.g. a uniqueness
 * check). The form dedupes in-flight checks per path, so only the latest
 * result is applied.
 */
export type FieldValidator<Values = unknown> = (
  value: unknown,
  values: Values,
  path: string
) => FormError | null | undefined | Promise<FormError | null | undefined>;

/**
 * Object-shaped validator spec mirroring the values shape. Leaves are
 * `FieldValidator`s. For arrays, pass an object spec and it will be applied to
 * every element.
 */
export type ValidatorObject<Values = unknown> = {
  [key: string]: FieldValidator<Values> | ValidatorObject<Values>;
};

/**
 * Full-values validator function — returns a flat FormErrors map.
 */
export type ValidatorFunction<Values> = (values: Values) => FormErrors;

/**
 * Resolver returned by `zodResolver`, `yupResolver`, etc. Runs a schema and
 * returns a flat FormErrors map on failure.
 */
export type ValidatorResolver<Values> = (values: Values) => FormErrors;

export type ValidatorSpec<Values> =
  | ValidatorObject<Values>
  | ValidatorFunction<Values>
  | ValidatorResolver<Values>;

export interface FormOptions<Values> {
  initialValues: Values;
  validate?: ValidatorSpec<Values>;
  /** Validate the single field on every change. Default: false. */
  validateInputOnChange?: boolean;
  /** Validate the single field on blur. Default: false. */
  validateInputOnBlur?: boolean;
  /** Clear a field's error when its value changes. Default: true. */
  clearInputErrorOnChange?: boolean;
  /** Transformed snapshot exposed via `getTransformedValues()`. */
  transformValues?: (values: Values) => unknown;
  /** Enhance the form handle — called once at creation. */
  enhance?: (form: MikataForm<Values>) => void;
  /**
   * Debounce window (ms) applied before invoking validators triggered by
   * `validateInputOnChange`. Useful when validators are async and hit the
   * network — set to 300–500 so fast typing doesn't fire a request per key.
   * Default: 0 (no debounce — validator runs on every change).
   */
  asyncDebounceMs?: number;
}

export interface GetInputPropsOptions {
  /** 'input' (default) for text/value inputs, 'checkbox' for boolean toggles. */
  type?: 'input' | 'checkbox';
  /** Include the field's error in the returned props. Default: true. */
  withError?: boolean;
  /** Register a ref so onSubmit can focus the first invalid field. Default: true. */
  withFocus?: boolean;
}

export interface InputProps {
  value?: unknown;
  checked?: boolean;
  onChange: (eventOrValue: unknown) => void;
  onInput?: (eventOrValue: unknown) => void;
  onBlur: (event: FocusEvent) => void;
  /**
   * Reactive error getter. Reads the current error for the bound path from the
   * form's signal, so consuming UI components can subscribe (via `effect`) and
   * update the error display when validation runs.
   */
  error?: () => FormError | null | undefined;
  ref?: (el: HTMLElement | null) => void;
}

/**
 * A scoped view of a form, rooted at a dotted path. Every method appends the
 * scope's prefix before delegating to the underlying form, so
 * `form.scope('addresses.0').getInputProps('street')` writes to
 * `addresses.0.street` on the parent form.
 *
 * Nest with `.scope(subPath)` to drill further without rebuilding strings.
 */
export interface FormScope {
  /** Fully-qualified path this scope is rooted at (dotted, no trailing `.`). */
  readonly path: string;
  getInputProps: (path: string, options?: GetInputPropsOptions) => InputProps;
  setFieldValue: (path: string, value: unknown) => void;
  getValue: (path: string) => unknown;
  /** Errors whose keys fall under this scope, with the prefix stripped. */
  errors: () => FormErrors;
  insertListItem: (path: string, item: unknown, index?: number) => void;
  removeListItem: (path: string, index: number) => void;
  reorderListItem: (path: string, range: { from: number; to: number }) => void;
  replaceListItem: (path: string, index: number, item: unknown) => void;
  scope: (subPath: string) => FormScope;
}

export interface MikataForm<Values> {
  // Values
  readonly values: Values;
  getValues: () => Values;
  getValue: (path: string) => unknown;
  setValues: (values: Partial<Values> | ((prev: Values) => Values)) => void;
  setFieldValue: (path: string, value: unknown) => void;
  reset: () => void;
  initialize: (values: Values) => void;

  // Errors
  readonly errors: FormErrors;
  setErrors: (errors: FormErrors) => void;
  setFieldError: (path: string, error: FormError) => void;
  clearErrors: () => void;
  clearFieldError: (path: string) => void;

  // Status
  isValid: () => boolean;
  isDirty: (path?: string) => boolean;
  isTouched: (path?: string) => boolean;
  getTouched: () => Record<string, boolean>;
  getDirty: () => Record<string, boolean>;
  resetTouched: () => void;
  resetDirty: () => void;

  // Validation
  validate: () => { hasErrors: boolean; errors: FormErrors };
  validateField: (path: string) => { hasError: boolean; error: FormError | null };
  /**
   * Reactive: `true` when at least one async validator is pending. Pass a
   * path to narrow to a specific field.
   */
  isValidating: (path?: string) => boolean;

  // Binding
  getInputProps: (path: string, options?: GetInputPropsOptions) => InputProps;

  // Array helpers
  insertListItem: (path: string, item: unknown, index?: number) => void;
  removeListItem: (path: string, index: number) => void;
  reorderListItem: (path: string, range: { from: number; to: number }) => void;
  replaceListItem: (path: string, index: number, item: unknown) => void;

  // Submit
  onSubmit: (
    onValid: (values: Values, event: Event) => void,
    onInvalid?: (errors: FormErrors, event: Event) => void
  ) => (event: Event) => void;
  onReset: (handler?: (event: Event) => void) => (event: Event) => void;

  // Transform + watch
  getTransformedValues: () => unknown;
  watch: (path: string, callback: (value: unknown) => void) => () => void;

  // Scoped sub-form for nested/array fields
  scope: (path: string) => FormScope;
}
