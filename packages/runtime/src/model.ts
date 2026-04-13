/**
 * model() - two-way form bindings for signals.
 *
 * Returns an object of props to spread onto a form element.
 * Works with input (text, number, checkbox, radio), textarea, and select.
 *
 * Usage:
 *   const [name, setName] = signal('');
 *   <input {...model(name, setName)} />
 *
 *   const [checked, setChecked] = signal(false);
 *   <input type="checkbox" {...model(checked, setChecked, 'checkbox')} />
 */

type ModelType = 'text' | 'checkbox' | 'radio' | 'number' | 'select';

interface ModelProps {
  /** Getter-backed value prop - stays reactive when spread */
  readonly value?: unknown;
  readonly checked?: boolean;
  /** Input handler */
  onInput?: (e: Event) => void;
  onChange?: (e: Event) => void;
  // Widen so the return value is spread-compatible with `_spread`'s accessor
  // signature (which expects a Readonly<Record<string, unknown>>).
  readonly [key: string]: unknown;
}

/**
 * Create two-way binding props for a form element.
 *
 * @param getter Signal getter function
 * @param setter Signal setter function
 * @param type Element type hint (default: 'text')
 */
export function model<T>(
  getter: () => T,
  // NoInfer so T is fixed by the getter and WriteSignal<T>'s overload
  // (updater: (prev: T) => T) => void doesn't hijack inference.
  setter: (value: NoInfer<T>) => void,
  type: ModelType = 'text'
): ModelProps {
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
