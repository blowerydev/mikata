import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';
import { Link } from '../../components/Link';

const setupExample = await highlight(
  `import { ThemeProvider, Button, TextInput } from '@mikata/ui';
import '@mikata/ui/styles.css';

function App() {
  return (
    <ThemeProvider>
      <TextInput label="Email" type="email" />
      <Button variant="primary">Sign up</Button>
    </ThemeProvider>
  );
}`,
  'tsx',
);

const modelExample = await highlight(
  `import { signal, model } from 'mikata';
import { TextInput, Checkbox } from '@mikata/ui';

const [name, setName] = signal('');
const [agree, setAgree] = signal(false);

<TextInput label="Name" {...model(name, setName)} />
<Checkbox label="I agree" {...model(agree, setAgree, 'checkbox')} />`,
  'tsx',
);

export default function UIOverview() {
  useMeta({ title: '@mikata/ui - Component library' });
  return (
    <article>
      <h1>@mikata/ui</h1>
      <p>
        A library of 80+ accessible, themeable components built on top
        of Mikata. Buttons, inputs, modals, data tables, date pickers,
        and more - all following the same prop shape so{' '}
        <code>model()</code> wires them up the same way as native
        elements.
      </p>

      <h2>Setup</h2>
      <CodeBlock html={setupExample} />

      <h2>Form bindings</h2>
      <p>
        Form components expose the same <code>value</code>/
        <code>onInput</code>/<code>checked</code>/<code>onChange</code>{' '}
        shape Mikata's <code>model()</code> helper emits, so the spread
        pattern you use for native inputs works identically on them.
      </p>
      <CodeBlock html={modelExample} />

      <h2>Live playgrounds</h2>
      <p>
        Each component page includes a live playground - tweak props and
        see the widget update in place. Start with the{' '}
        <Link to="/ui/button">Button</Link> page.
      </p>
    </article>
  );
}
