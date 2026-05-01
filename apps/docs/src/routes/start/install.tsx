import { useMeta } from '@mikata/kit/head';
import { CodeBlock, highlight } from '../../components/CodeBlock';
import { Link } from '@mikata/router';

export const nav = { title: 'Installation', section: 'Start', order: 3 };

const createCmd = await highlight(
  `pnpm create mikata my-app

# or
npm create mikata@latest my-app`,
  'bash',
);
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
const viteConfig = await highlight(
  `import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';

export default defineConfig({
  plugins: [mikata()],
});`,
  'ts',
);
const tsConfig = await highlight(
  `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "jsx": "preserve",
    "jsxImportSource": "mikata",
    "noEmit": true
  },
  "include": ["src"]
}`,
  'json',
);
const html = await highlight(
  `<div id="app"></div>
<script type="module" src="/src/main.tsx"></script>`,
  'html',
);

export default function Install() {
  useMeta({
    title: 'Installation - Mikata',
    description: 'Install Mikata with create-mikata or add it to an existing Vite app.',
  });

  return (
    <article>
      <h1>Installation</h1>
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
        Add <code>mikata()</code> to your Vite plugins:
      </p>
      <CodeBlock html={viteConfig} />
      <p>
        Preserve JSX for Vite and point TypeScript's JSX import source at
        {' '}
        <code>mikata</code>:
      </p>
      <CodeBlock html={tsConfig} />
      <p>
        Finally, make sure your HTML has a mount node and loads your client
        entry:
      </p>
      <CodeBlock html={html} />

      <h2>Package managers</h2>
      <p>
        The generated project works with pnpm, npm, yarn, or bun. The repo uses
        pnpm, so docs examples prefer pnpm unless a command is npm-specific,
        such as <code>npm create mikata@latest</code>.
      </p>

      <h2>Troubleshooting</h2>
      <ul>
        <li>
          If JSX types are missing, check that <code>jsx</code> is{' '}
          <code>preserve</code> and <code>jsxImportSource</code> is{' '}
          <code>mikata</code>.
        </li>
        <li>
          If JSX renders as plain objects or does not update, confirm that the
          Vite config includes <code>@mikata/compiler</code>.
        </li>
        <li>
          If the app starts on a blank page, verify the HTML mount id matches
          the element passed to <code>render</code>.
        </li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/start/create-project">Create a project</Link> covers
          presets and feature flags.
        </li>
        <li>
          <Link to="/start/first-app">Your first app</Link> builds the first
          component in this setup.
        </li>
      </ul>
    </article>
  );
}
