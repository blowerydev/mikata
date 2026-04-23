import { signal } from '@mikata/reactivity';

export type PlaygroundControl =
  | { name: string; type: 'select'; options: readonly string[]; default: string; label?: string }
  | { name: string; type: 'boolean'; default: boolean; label?: string }
  | { name: string; type: 'text'; default: string; label?: string }
  | {
      name: string;
      type: 'number';
      default: number;
      min?: number;
      max?: number;
      step?: number;
      label?: string;
    };

export interface PlaygroundProps {
  controls: readonly PlaygroundControl[];
  render: (props: Record<string, unknown>) => Node;
}

/**
 * Live-editable widget preview. Each control becomes a signal; the
 * preview is a function-child accessor that re-evaluates when any read
 * signal changes, swapping the subtree in place via the runtime's
 * `_insert` reactive path. Iterations use function accessors instead
 * of `each()` because `each()` does not participate in the hydration
 * cursor (its items sit in a disconnected fragment, so click handlers
 * never reach the visible SSR-rendered DOM).
 */
export function Playground(props: PlaygroundProps) {
  const getters = new Map<string, () => unknown>();
  const setters = new Map<string, (v: unknown) => void>();
  for (const control of props.controls) {
    const [get, setValue] = signal<unknown>(control.default);
    getters.set(control.name, get);
    setters.set(control.name, setValue);
  }

  const resolved = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const control of props.controls) {
      out[control.name] = getters.get(control.name)!();
    }
    return out;
  };

  const set = (name: string, v: unknown): void => {
    setters.get(name)!(v);
  };

  return (
    <div class="playground">
      <div class="playground-preview">
        {() => props.render(resolved())}
        {''}
      </div>
      <div class="playground-controls">
        {() =>
          props.controls.map((control) => (
            <ControlInput control={control} set={set} />
          ))
        }
      </div>
    </div>
  );
}

function ControlInput(props: {
  control: PlaygroundControl;
  set: (name: string, v: unknown) => void;
}) {
  const c = props.control;
  const label = c.label ?? c.name;

  if (c.type === 'select') {
    return (
      <label class="control control--select">
        <span class="control-label">{label}</span>
        <select
          onChange={(e: Event) =>
            props.set(c.name, (e.target as HTMLSelectElement).value)
          }
        >
          {() =>
            c.options.map((opt) => (
              <option value={opt} selected={opt === c.default}>
                {opt}
              </option>
            ))
          }
        </select>
      </label>
    );
  }

  if (c.type === 'boolean') {
    return (
      <label class="control control--boolean">
        <input
          type="checkbox"
          checked={c.default}
          onChange={(e: Event) =>
            props.set(c.name, (e.target as HTMLInputElement).checked)
          }
        />
        <span class="control-label">{label}</span>
      </label>
    );
  }

  if (c.type === 'number') {
    return (
      <label class="control control--number">
        <span class="control-label">{label}</span>
        <input
          type="number"
          value={String(c.default)}
          min={c.min}
          max={c.max}
          step={c.step ?? 1}
          onInput={(e: Event) =>
            props.set(c.name, Number((e.target as HTMLInputElement).value))
          }
        />
      </label>
    );
  }

  return (
    <label class="control control--text">
      <span class="control-label">{label}</span>
      <input
        type="text"
        value={c.default}
        onInput={(e: Event) =>
          props.set(c.name, (e.target as HTMLInputElement).value)
        }
      />
    </label>
  );
}
