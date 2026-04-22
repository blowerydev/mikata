/**
 * model() - two-way form bindings for signals.
 *
 * Returns an object of props to spread onto a form element.
 * Works with input (text, number, checkbox, radio), textarea, and select.
 *
 * The call signature is overloaded on `type` so the returned props object
 * is narrowed to the exact shape the element expects — destructuring a
 * checkbox binding gives you `{ checked, onChange }`, a text binding gives
 * you `{ value, onInput }`. The index signature is preserved on every
 * branch so the result stays spread-compatible with the compiler's
 * `_spread` accessor.
 *
 * Usage:
 *   const [name, setName] = signal('');
 *   <input {...model(name, setName)} />
 *
 *   const [checked, setChecked] = signal(false);
 *   <input type="checkbox" {...model(checked, setChecked, 'checkbox')} />
 */

type ModelType = 'text' | 'checkbox' | 'radio' | 'number' | 'select';

/**
 * Base shape every branch inherits: the `[key: string]: unknown` index
 * signature makes the return value assignable to the
 * `Readonly<Record<string, unknown>>` that the compiler's `_spread`
 * helper expects when these props are spread onto a JSX element.
 */
interface BaseModelProps {
  readonly [key: string]: unknown;
}

/** Props for text / textarea / number inputs — writes flow through `onInput`. */
export interface InputModelProps<T> extends BaseModelProps {
  readonly value: T;
  onInput: (e: Event) => void;
}

/** Props for checkbox / radio — writes flow through `onChange` and read from `checked`. */
export interface CheckedModelProps extends BaseModelProps {
  readonly checked: boolean;
  onChange: (e: Event) => void;
}

/** Props for `<select>` — writes flow through `onChange`. */
export interface SelectModelProps<T> extends BaseModelProps {
  readonly value: T;
  onChange: (e: Event) => void;
}

/**
 * Default (no type / `'text'`) — text input binding.
 */
export function model<T>(
  getter: () => T,
  setter: (value: NoInfer<T>) => void,
): InputModelProps<T>;

/**
 * Text or number input — write flows through `onInput`. `'number'`
 * reads `valueAsNumber` off the event target, coercing NaN to `0`.
 */
export function model<T>(
  getter: () => T,
  setter: (value: NoInfer<T>) => void,
  type: 'text' | 'number',
): InputModelProps<T>;

/**
 * Checkbox or radio — write flows through `onChange`, read via the
 * `checked` attribute. For radio groups set each input's `value=` to
 * the candidate value; `model()` forwards `e.target.value` to the setter.
 */
export function model<T>(
  getter: () => T,
  setter: (value: NoInfer<T>) => void,
  type: 'checkbox' | 'radio',
): CheckedModelProps;

/**
 * `<select>` — write flows through `onChange`.
 */
export function model<T>(
  getter: () => T,
  setter: (value: NoInfer<T>) => void,
  type: 'select',
): SelectModelProps<T>;

export function model<T>(
  getter: () => T,
  // NoInfer so T is fixed by the getter and WriteSignal<T>'s overload
  // (updater: (prev: T) => T) => void doesn't hijack inference.
  setter: (value: NoInfer<T>) => void,
  type: ModelType = 'text',
): InputModelProps<T> | CheckedModelProps | SelectModelProps<T> {
  if (type === 'checkbox') {
    return {
      get checked() {
        return getter() as boolean;
      },
      onChange(e: Event) {
        setter((e.target as HTMLInputElement).checked as unknown as T);
      },
    };
  }

  if (type === 'radio') {
    return {
      get checked() {
        return getter() as boolean;
      },
      onChange(e: Event) {
        setter((e.target as HTMLInputElement).value as unknown as T);
      },
    };
  }

  if (type === 'number') {
    return {
      get value() {
        return getter();
      },
      onInput(e: Event) {
        const val = (e.target as HTMLInputElement).valueAsNumber;
        setter((isNaN(val) ? 0 : val) as unknown as T);
      },
    };
  }

  if (type === 'select') {
    return {
      get value() {
        return getter();
      },
      onChange(e: Event) {
        setter((e.target as HTMLSelectElement).value as unknown as T);
      },
    };
  }

  // Default: text / textarea
  return {
    get value() {
      return getter();
    },
    onInput(e: Event) {
      setter((e.target as HTMLInputElement).value as unknown as T);
    },
  };
}
