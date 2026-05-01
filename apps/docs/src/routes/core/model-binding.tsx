import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Forms & model binding', section: 'Core Concepts', order: 7 };

const basicModel = await highlight(
  `import { signal, model } from 'mikata';

function ProfileForm() {
  const [name, setName] = signal('');
  const [age, setAge] = signal(0);
  const [subscribed, setSubscribed] = signal(false);

  return (
    <form>
      <input {...model(name, setName)} />
      <input type="number" {...model(age, setAge, 'number')} />
      <input type="checkbox" {...model(subscribed, setSubscribed, 'checkbox')} />
    </form>
  );
}`,
  'tsx',
);

const controlled = await highlight(
  `<input
  value={name()}
  onInput={(event) => setName(event.currentTarget.value)}
/>

<select {...model(plan, setPlan, 'select')}>
  <option value="free">Free</option>
  <option value="team">Team</option>
</select>`,
  'tsx',
);

export default function ModelBinding() {
  useMeta({
    title: 'Forms & model binding - Mikata',
    description: 'Bind signals to inputs with model or explicit event handlers.',
  });

  return (
    <article>
      <h1>Forms &amp; model binding</h1>
      <p>
        Mikata inputs can be controlled manually with native events, or bound to
        signals with <code>model()</code>. The helper returns the right{' '}
        <code>value</code>/<code>checked</code> and event props for common form
        controls.
      </p>

      <h2>Use model for simple fields</h2>
      <CodeBlock html={basicModel} />
      <p>
        Text and textarea bindings write on <code>input</code>. Checkboxes,
        radios, and selects write on <code>change</code>. Number inputs read{' '}
        <code>valueAsNumber</code> and coerce <code>NaN</code> to <code>0</code>.
      </p>

      <h2>Manual control is always available</h2>
      <p>
        <code>model()</code> is only a convenience. Use explicit attributes and
        handlers when you need custom parsing, validation timing, or browser
        behavior.
      </p>
      <CodeBlock html={controlled} />

      <h2>Forms package relationship</h2>
      <p>
        Use <code>model()</code> for direct signal-to-input bindings. Use{' '}
        <code>@mikata/form</code> when you need field errors, validation
        resolvers, submit handling, touched state, or nested form values.
      </p>

      <h2>UI components</h2>
      <p>
        UI inputs expose controlled props and form helper props. The same rule
        applies: either spread a binding/helper when it matches the component,
        or wire the value and event explicitly.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/ui/inputs">Inputs</Link> covers component-specific
          input props.
        </li>
        <li>
          <Link to="/packages/form">Form package</Link> tracks the validation
          and submit API.
        </li>
      </ul>
    </article>
  );
}
