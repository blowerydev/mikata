import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Create a project', section: 'Start', order: 4 };

const interactive = await highlight(
  `pnpm create mikata my-app

# or
npm create mikata@latest my-app`,
  'bash',
);

const presets = await highlight(
  `pnpm create mikata my-app --template minimal
pnpm create mikata my-app --template spa
pnpm create mikata my-app --template ssr
pnpm create mikata my-app --template full`,
  'bash',
);

const unattended = await highlight(
  `pnpm create mikata dashboard --template ssr --ui --form --testing --pm pnpm --yes

# Feature flags can also remove preset defaults.
pnpm create mikata tiny-spa --template spa --no-testing --yes`,
  'bash',
);

export default function CreateProject() {
  useMeta({
    title: 'Create a project - Mikata',
    description: 'Scaffold a new Mikata app with create-mikata.',
  });

  return (
    <article>
      <h1>Create a project</h1>
      <p>
        <code>create-mikata</code> builds a Vite project, adds the Mikata
        compiler, and overlays only the framework packages you choose. Use it
        for new apps, examples, and quick experiments where you want the file
        layout and package versions to match the current repo.
      </p>

      <h2>Interactive setup</h2>
      <p>
        Run the create command with a project name. The CLI asks which features
        to include and which package manager to show in the final install
        instructions.
      </p>
      <CodeBlock html={interactive} />

      <h2>Presets</h2>
      <p>
        Presets are shortcuts for common starting points. <code>minimal</code>
        is a plain Vite app with signals and JSX, <code>spa</code> adds the
        router and tests, <code>ssr</code> adds Kit and tests, and{' '}
        <code>full</code> adds the client-side app stack.
      </p>
      <CodeBlock html={presets} />

      <h2>Feature flags</h2>
      <p>
        Every interactive choice is also available as a flag. This is useful
        in scripts, issue repros, and docs examples where you want the scaffold
        to be repeatable.
      </p>
      <CodeBlock html={unattended} />

      <table>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Adds</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>--router</code>
            </td>
            <td>Client-side routes with <code>@mikata/router</code>.</td>
          </tr>
          <tr>
            <td>
              <code>--kit</code>
            </td>
            <td>File routes, SSR entries, API route support, and a Node server.</td>
          </tr>
          <tr>
            <td>
              <code>--ui</code> / <code>--icons</code>
            </td>
            <td>Component styling, <code>ThemeProvider</code>, and icon imports.</td>
          </tr>
          <tr>
            <td>
              <code>--form</code>
            </td>
            <td>A typed contact form example using <code>createForm</code>.</td>
          </tr>
          <tr>
            <td>
              <code>--i18n</code>
            </td>
            <td>Locale setup and sample English/French messages.</td>
          </tr>
          <tr>
            <td>
              <code>--store</code> / <code>--persist</code>
            </td>
            <td>Query state and storage-backed signal examples.</td>
          </tr>
          <tr>
            <td>
              <code>--testing</code> / <code>--eslint</code>
            </td>
            <td>Vitest, jsdom, render helpers, and Mikata lint rules.</td>
          </tr>
          <tr>
            <td>
              <code>--tailwind</code>
            </td>
            <td>Tailwind and PostCSS files wired into the generated app.</td>
          </tr>
        </tbody>
      </table>

      <h2>Rules to know</h2>
      <ul>
        <li>
          Project names must use lowercase letters, digits, and hyphens, and
          must start with a letter or digit.
        </li>
        <li>
          The target folder can already exist only when it is otherwise empty
          except for files such as <code>.git</code>, <code>.DS_Store</code>,
          or <code>Thumbs.db</code>.
        </li>
        <li>
          <code>--kit</code> includes file-based routing, so the scaffold drops
          {' '}
          <code>--router</code> when both are selected.
        </li>
        <li>
          Use <code>--pm pnpm</code>, <code>--pm npm</code>,{' '}
          <code>--pm yarn</code>, or <code>--pm bun</code> to choose the install
          and run commands printed after scaffolding.
        </li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/start/project-structure">Project structure</Link> explains
          the files the scaffold writes.
        </li>
        <li>
          <Link to="/start/first-app">Your first app</Link> walks through the
          first component you are likely to edit.
        </li>
        <li>
          <Link to="/tooling/create-mikata">CLI reference</Link> tracks the
          complete command reference as the tooling docs fill in.
        </li>
      </ul>
    </article>
  );
}
