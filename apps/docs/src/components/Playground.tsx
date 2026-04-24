import { signal } from '@mikata/reactivity';
import { reactiveProps } from '@mikata/runtime';
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
  /**
   * Build the preview subtree from reactive-backed props. The object
   * passed in is a getter-per-key proxy built with `reactiveProps`, so
   * the callback MUST NOT destructure - do `props.size`, not
   * `{ size }`. `render` is called exactly once; control changes flow
   * through the getters so downstream components update in place
   * instead of being torn down and rebuilt.
   */
  render: (props: Record<string, unknown>) => Node;
}

/**
 * Live-editable widget preview. Each control backs a signal, and the
 * signals are wrapped into a getter-per-key props object with
 * `reactiveProps`. The render callback runs once with that object; the
 * previewed component reads `props.size` etc. through the getters, so
 * internal scopes (Table's sort state, Calendar's focused date) survive
 * control changes - only the specific `renderEffect` tied to a changed
 * prop re-runs. The old `{() => render(resolved())}` pattern disposed
 * the whole subtree on every change, which showed up as jank in
 * stateful components.
 *
 * Controls are rendered with real @mikata/ui inputs so the docs
 * exercise the same components they document.
 */
export function Playground(props: PlaygroundProps) {
  const getters: Record<string, () => unknown> = {};
  const setters = new Map<string, (v: unknown) => void>();
  for (const control of props.controls) {
    const [get, setValue] = signal<unknown>(control.default);
    getters[control.name] = get;
    setters.set(control.name, setValue);
  }

  const liveProps = reactiveProps(getters);

  const set = (name: string, v: unknown): void => {
    setters.get(name)!(v);
  };

  return (
    <div class="playground">
      {/* Accessor form for two reasons:
          1. Routes through `_insert` (not text-bake) so the returned
             Node is inserted as a child, not `.data`-assigned to a
             text node.
          2. Defers the `props.render(...)` call until the slot is
             being populated, so Button's internal `adoptElement` adopts
             from the correctly-scoped hydration cursor. Calling
             `props.render(liveProps)` outside the JSX would consume
             the wrong SSR node and desync every subsequent adopt.
          The accessor has no reactive deps (`liveProps` is a stable
          getter-backed object), so it runs once. */}
      <div class="playground-preview">{() => props.render(liveProps)}</div>
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
