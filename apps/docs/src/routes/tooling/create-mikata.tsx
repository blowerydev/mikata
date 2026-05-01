import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'CLI / create-mikata', section: 'Tooling', order: 1 };

const quickStart = await highlight(
  `pnpm create mikata my-app --template spa --pm pnpm
cd my-app
pnpm install
pnpm dev`,
  'shell',
);

const fullStack = await highlight(
  `pnpm create mikata dashboard \\
  --template full \\
  --kit \\
  --ui \\
  --testing \\
  --eslint \\
  --pm pnpm`,
  'shell',
);

export default function CreateMikataTooling() {
  useMeta({
    title: 'CLI / create-mikata - Mikata tooling',
    description: 'Scaffold Mikata projects with presets, feature flags, and package manager hints.',
  });

  return (
    <article>
      <h1>CLI / create-mikata</h1>
      <p>
        <code>create-mikata</code> scaffolds a Vite-based Mikata project from
        composable template overlays. Use it for new apps, for checking the
        recommended file layout, or for generating a small reference project
        while learning a package.
      </p>

      <h2>Quick start</h2>
      <p>
        The <code>spa</code> preset includes the router and test setup. The
        generated app prints the correct install and dev commands for the
        package manager you choose.
      </p>
      <CodeBlock html={quickStart} />

      <h2>Presets</h2>
      <table>
        <thead>
          <tr>
            <th>Preset</th>
            <th>Includes</th>
            <th>Use for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>minimal</code>
            </td>
            <td>Compiler, runtime, reactivity, and a plain app entry.</td>
            <td>Small experiments and library reproduction cases.</td>
          </tr>
          <tr>
            <td>
              <code>spa</code>
            </td>
            <td>
              <code>router</code> and <code>testing</code>.
            </td>
            <td>Client-side apps without SSR.</td>
          </tr>
          <tr>
            <td>
              <code>ssr</code>
            </td>
            <td>
              <code>kit</code> and <code>testing</code>.
            </td>
            <td>File-routed apps with SSR or prerendering.</td>
          </tr>
          <tr>
            <td>
              <code>full</code>
            </td>
            <td>Router, UI, icons, form, i18n, store, testing, and ESLint.</td>
            <td>Feature-rich starters and demos.</td>
          </tr>
        </tbody>
      </table>

      <h2>Feature flags</h2>
      <p>
        Explicit flags are merged with the preset. A <code>--no-*</code> flag
        removes a preset feature. When <code>--kit</code> and
        <code>--router</code> are both selected, the scaffold keeps Kit and
        drops the manual router because Kit provides file-based routing.
      </p>
      <table>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Adds</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['--router', '@mikata/router and src/pages examples'],
            ['--kit', '@mikata/kit entries, src/routes, API route, and server.js'],
            ['--ui', '@mikata/ui, stylesheet import, and ThemeProvider'],
            ['--icons', '@mikata/icons examples'],
            ['--form', '@mikata/form example code'],
            ['--i18n', '@mikata/i18n dictionaries and provider setup'],
            ['--store', '@mikata/store query example'],
            ['--persist', '@mikata/persist counter state'],
            ['--testing', 'Vitest, jsdom, @mikata/testing, and a sample test'],
            ['--eslint', 'ESLint 9 flat config and Mikata rules'],
            ['--tailwind', 'Tailwind setup and stylesheet'],
          ].map(([flag, adds]) => (
            <tr>
              <td>
                <code>{flag}</code>
              </td>
              <td>{adds}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Non-interactive scaffolds</h2>
      <p>
        Pass a project name, preset or feature flags, and <code>--yes</code> to
        skip prompts in scripts or smoke tests.
      </p>
      <CodeBlock html={fullStack} />

      <h2>Generated project rules</h2>
      <ul>
        <li>Project names must use lowercase letters, digits, and hyphens.</li>
        <li>The target directory must be empty except for ignored OS and Git files.</li>
        <li>Template dotfiles are stored with leading underscores and restored on write.</li>
        <li>Feature overlays merge dependencies, dev dependencies, and scripts into package.json.</li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/start/create-project">Create a project</Link> walks through
          the interactive flow.
        </li>
        <li>
          <Link to="/start/project-structure">Project structure</Link> explains
          the generated files.
        </li>
        <li>
          <Link to="/packages/create-mikata">create-mikata package reference</Link>
          lists the CLI surface.
        </li>
      </ul>
    </article>
  );
}
