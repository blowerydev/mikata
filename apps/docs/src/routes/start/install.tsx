import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';
import { Link } from '@mikata/router';

export const nav = { title: 'Install', section: 'Start', order: 2 };

const createCmd = await highlight(`npm create mikata@latest my-app`, 'bash');
const runCmd = await highlight(
  `cd my-app
pnpm install
pnpm dev`,
  'bash',
);
const manualDeps = await highlight(
  `{
  "dependencies": {
    "mikata": "^0.1.0"
  },
  "devDependencies": {
    "@mikata/compiler": "^0.1.0",
    "vite": "^6.0.0"
  }
}`,
  'json',
);

export default function Install() {
  useMeta({ title: 'Install - Mikata' });
  return (
    <article>
      <h1>Install</h1>
      <h2>Scaffold a new project</h2>
      <p>
        The fastest way to get started is <code>create-mikata</code>, an
        interactive scaffolder that picks features (router, UI, store, i18n,
        testing, &hellip;) and wires them together.
      </p>
      <CodeBlock html={createCmd} />
      <p>Then:</p>
      <CodeBlock html={runCmd} />
      <h2>Add Mikata to an existing Vite project</h2>
      <p>
        If you already have a Vite project, Mikata is two packages: the
        runtime (<code>mikata</code>) and the Vite JSX plugin
        (<code>@mikata/compiler</code>).
      </p>
      <CodeBlock html={manualDeps} />
      <p>
        Next, add <code>mikata()</code> to your Vite plugins and set your
        tsconfig's <code>jsxImportSource</code> to <code>@mikata/runtime</code>.
        See <Link to="/start/first-app">Your first app</Link> for the full
        setup.
      </p>
    </article>
  );
}
