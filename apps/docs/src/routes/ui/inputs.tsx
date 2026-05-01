import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Inputs', section: 'UI', order: 4 };

const modelExample = await highlight(
  `import { signal, model } from 'mikata';
import { TextInput, Checkbox, Select } from '@mikata/ui';

const [name, setName] = signal('');
const [agree, setAgree] = signal(false);
const [role, setRole] = signal('reader');

<TextInput label="Name" {...model(name, setName)} />
<Checkbox label="I agree" {...model(agree, setAgree, 'checkbox')} />
<Select
  label="Role"
  data={[
    { value: 'reader', label: 'Reader' },
    { value: 'editor', label: 'Editor' },
  ]}
  value={role()}
  onChange={(event) => setRole(event.currentTarget.value)}
/>`,
  'tsx',
);

const validationExample = await highlight(
  `<TextInput
  label="Email"
  type="email"
  required
  error={() => emailError()}
  aria-invalid={!!emailError()}
/>

<NumberInput
  label="Seats"
  min={1}
  max={50}
  onValueChange={setSeats}
/>`,
  'tsx',
);

export default function Inputs() {
  useMeta({
    title: 'Inputs - @mikata/ui',
    description: 'Use @mikata/ui text, selection, boolean, range, rating, file, and date inputs.',
  });

  return (
    <article>
      <h1>Inputs</h1>
      <p>
        Input components follow native form semantics while adding labels,
        descriptions, errors, sizing, and themed styling. Most controls support
        controlled and default value modes.
      </p>

      <h2>Sub-groups</h2>
      <div class="component-map">
        <section class="component-group">
          <h3>Text and numbers</h3>
          <p>Single-line, multi-line, password, numeric, and PIN entry.</p>
          <div class="component-list">
            <code>TextInput</code>
            <code>Textarea</code>
            <code>PasswordInput</code>
            <code>NumberInput</code>
            <code>PinInput</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Choices</h3>
          <p>Boolean, single-select, multi-select, tag, chip, and rating input.</p>
          <div class="component-list">
            <code>Checkbox</code>
            <code>Radio</code>
            <code>Switch</code>
            <code>Select</code>
            <code>MultiSelect</code>
            <code>TagsInput</code>
            <code>Rating</code>
            <code>Chip</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Ranges and files</h3>
          <p>Numeric ranges and file selection helpers.</p>
          <div class="component-list">
            <code>Slider</code>
            <code>RangeSlider</code>
            <code>FileInput</code>
            <code>FileButton</code>
          </div>
        </section>
        <section class="component-group">
          <h3>Dates</h3>
          <p>Calendar widgets, date picker inputs, and time input.</p>
          <div class="component-list">
            <code>Calendar</code>
            <code>DatePicker</code>
            <code>DateInput</code>
            <code>DatePickerInput</code>
            <code>TimeInput</code>
          </div>
        </section>
      </div>

      <h2>Model binding</h2>
      <p>
        Text and checkbox-style controls match Mikata's native
        <code>model()</code> helper shape. Selection controls expose native
        change events so you can write the selected value directly.
      </p>
      <CodeBlock html={modelExample} />

      <h2>Validation</h2>
      <p>
        Inputs that use the shared wrapper accept <code>label</code>,
        <code>description</code>, <code>error</code>, <code>required</code>, and
        <code>aria-invalid</code>. Keep validation text close to the control it
        describes.
      </p>
      <CodeBlock html={validationExample} />

      <h2>Common props</h2>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>value</code> / <code>defaultValue</code>
            </td>
            <td>Controlled or initial value for text, select, and range inputs.</td>
          </tr>
          <tr>
            <td>
              <code>checked</code> / <code>defaultChecked</code>
            </td>
            <td>Controlled or initial state for boolean inputs.</td>
          </tr>
          <tr>
            <td>
              <code>size</code>
            </td>
            <td>Applies a shared density scale.</td>
          </tr>
          <tr>
            <td>
              <code>classNames</code>
            </td>
            <td>Targets internal slots such as wrapper, input, label, or error.</td>
          </tr>
        </tbody>
      </table>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/core/model-binding">Model binding</Link> explains
          <code>model()</code> for native and UI controls.
        </li>
        <li>
          <Link to="/state/i18n">i18n</Link> covers translating labels and
          validation copy.
        </li>
      </ul>
    </article>
  );
}
