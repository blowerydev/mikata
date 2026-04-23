import { signal } from '@mikata/reactivity';
import {
  Checkbox,
  NumberInput,
  Select,
  TextInput,
} from '@mikata/ui';

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
 *
 * Controls are rendered with real @mikata/ui inputs so the docs
 * exercise the same components they document.
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
    return Select({
      label,
      size: 'sm',
      data: c.options.map((opt) => ({ value: opt, label: opt })),
      defaultValue: c.default,
      onChange: (e) => props.set(c.name, e.currentTarget.value),
    });
  }

  if (c.type === 'boolean') {
    return Checkbox({
      label,
      size: 'sm',
      defaultChecked: c.default,
      onChange: (e) =>
        props.set(c.name, (e.target as HTMLInputElement).checked),
    });
  }

  if (c.type === 'number') {
    return NumberInput({
      label,
      size: 'sm',
      defaultValue: c.default,
      min: c.min,
      max: c.max,
      step: c.step,
      onValueChange: (v) => props.set(c.name, v),
    });
  }

  return TextInput({
    label,
    size: 'sm',
    defaultValue: c.default,
    onInput: (e) => props.set(c.name, e.currentTarget.value),
  });
}
