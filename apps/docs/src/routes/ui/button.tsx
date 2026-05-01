import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { Button, ButtonGroup } from '@mikata/ui';
import { CodeBlock, highlight } from '../../components/CodeBlock';
import { Playground, type PlaygroundControl } from '../../components/Playground';

const usage = await highlight(
  `import { Button } from '@mikata/ui';

<Button variant="filled" size="md" onClick={save}>
  Save changes
</Button>`,
  'tsx',
);

const examples = await highlight(
  `<Button variant="filled">Save</Button>
<Button variant="outline">Preview</Button>
<Button variant="subtle">Cancel</Button>

<Button loading>Saving</Button>
<Button disabled>Unavailable</Button>
<Button fullWidth>Continue</Button>`,
  'tsx',
);

const groupExample = await highlight(
  `import { Button, ButtonGroup } from '@mikata/ui';

<ButtonGroup>
  <Button variant="outline">Back</Button>
  <Button>Next</Button>
</ButtonGroup>`,
  'tsx',
);

const controls = [
  { name: 'size', type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
  {
    name: 'variant',
    type: 'select',
    options: ['filled', 'outline', 'light', 'subtle', 'transparent'],
    default: 'filled',
  },
  { name: 'color', type: 'select', options: ['primary', 'gray', 'red', 'green', 'blue'], default: 'primary' },
  { name: 'label', type: 'text', default: 'Save changes' },
  { name: 'fullWidth', type: 'boolean', default: false, label: 'full width' },
  { name: 'disabled', type: 'boolean', default: false },
  { name: 'loading', type: 'boolean', default: false },
] as const satisfies readonly PlaygroundControl[];

export default function ButtonPage() {
  useMeta({
    title: 'Button - @mikata/ui',
    description: 'Use @mikata/ui Button for primary, secondary, loading, and grouped actions.',
  });

  return (
    <article>
      <h1>Button</h1>
      <p>
        <code>Button</code> renders a semantic <code>button</code> for user
        actions. Use variant, color, size, and loading state to express action
        priority without changing the underlying event model.
      </p>

      <h2>Usage</h2>
      <CodeBlock html={usage} />

      <h2>Examples</h2>
      <div class="example-strip">
        <Button variant="filled">Save</Button>
        <Button variant="outline">Preview</Button>
        <Button variant="subtle">Cancel</Button>
      </div>
      <div class="example-strip">
        <Button loading>Saving</Button>
        <Button disabled>Unavailable</Button>
        <ButtonGroup>
          <Button variant="outline">Back</Button>
          <Button>Next</Button>
        </ButtonGroup>
      </div>
      <CodeBlock html={examples} />
      <CodeBlock html={groupExample} />

      <h2>Playground</h2>
      <p>
        Tweak the controls in the right panel. The preview keeps the rendered
        button separate from the prop controls, matching the pattern used by the
        rest of the component docs.
      </p>
      <Playground
        controls={controls}
        render={(props) => (
          <Button
            variant={props.variant}
            size={props.size}
            color={props.color}
            disabled={props.disabled}
            loading={props.loading}
            fullWidth={props.fullWidth}
          >
            {props.label}
          </Button>
        )}
      />

      <h2>Props</h2>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Default</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>variant</code>
            </td>
            <td>
              <code>'filled' | 'outline' | 'light' | 'subtle' | 'transparent'</code>
            </td>
            <td>
              <code>'filled'</code>
            </td>
            <td>Sets visual emphasis.</td>
          </tr>
          <tr>
            <td>
              <code>size</code>
            </td>
            <td>
              <code>'xs' | 'sm' | 'md' | 'lg' | 'xl'</code>
            </td>
            <td>
              <code>'md'</code>
            </td>
            <td>Controls height, padding, and label density.</td>
          </tr>
          <tr>
            <td>
              <code>color</code>
            </td>
            <td>
              <code>MikataColor</code>
            </td>
            <td>
              <code>'primary'</code>
            </td>
            <td>Chooses a built-in or custom theme palette.</td>
          </tr>
          <tr>
            <td>
              <code>loading</code>
            </td>
            <td>
              <code>boolean</code>
            </td>
            <td>
              <code>false</code>
            </td>
            <td>Shows a loader and prevents clicks.</td>
          </tr>
          <tr>
            <td>
              <code>disabled</code>
            </td>
            <td>
              <code>boolean</code>
            </td>
            <td>
              <code>false</code>
            </td>
            <td>Disables interaction and applies muted styling.</td>
          </tr>
          <tr>
            <td>
              <code>leftIcon</code> / <code>rightIcon</code>
            </td>
            <td>
              <code>Node</code>
            </td>
            <td>Unset</td>
            <td>Adds leading or trailing icon content.</td>
          </tr>
          <tr>
            <td>
              <code>fullWidth</code>
            </td>
            <td>
              <code>boolean</code>
            </td>
            <td>
              <code>false</code>
            </td>
            <td>Stretches the button to its container width.</td>
          </tr>
          <tr>
            <td>
              <code>type</code>
            </td>
            <td>
              <code>'submit' | 'reset' | 'button'</code>
            </td>
            <td>
              <code>'button'</code>
            </td>
            <td>Controls native form behavior.</td>
          </tr>
          <tr>
            <td>
              <code>classNames</code>
            </td>
            <td>
              <code>Partial&lt;Record&lt;'root' | 'label' | 'loader' | 'icon', string&gt;&gt;</code>
            </td>
            <td>Unset</td>
            <td>Targets internal parts for scoped styling.</td>
          </tr>
        </tbody>
      </table>

      <h2>Related</h2>
      <ul>
        <li>
          <code>ActionIcon</code> is better for icon-only actions.
        </li>
        <li>
          <code>CloseButton</code> is specialized for dismiss actions.
        </li>
        <li>
          <Link to="/ui/feedback">Feedback</Link> covers status components that
          often appear after button actions.
        </li>
      </ul>
    </article>
  );
}
