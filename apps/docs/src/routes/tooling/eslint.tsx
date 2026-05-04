import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'ESLint plugin', section: 'Tooling', order: 3 };

const flatConfig = await highlight(
  `import tseslint from 'typescript-eslint';
import mikata from '@mikata/eslint-plugin';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { mikata },
    rules: {
      'mikata/no-async-component': 'error',
      'mikata/rules-of-setup': 'error',
      'mikata/no-destructured-props': 'warn',
      'mikata/require-effect-cleanup': 'warn',
      'mikata/no-signal-write-in-computed': 'error',
      'mikata/require-signal-call': 'error',
      'mikata/no-signal-assignment': 'error',
      'mikata/no-stale-signal-read-in-effect': 'error',
      'mikata/prefer-selector-in-each': 'warn',
    },
  },
);`,
  'js',
);

const kitRules = await highlight(
  `{
  files: ['src/routes/**/*.{ts,tsx}'],
  rules: {
    'mikata/no-discarded-redirect': 'error',
    'mikata/no-api-route-default-export': 'error',
  },
}`,
  'js',
);

export default function EslintTooling() {
  useMeta({
    title: 'ESLint plugin - Mikata tooling',
    description: 'Configure @mikata/eslint-plugin and understand the recommended rules.',
  });

  return (
    <article>
      <h1>ESLint plugin</h1>
      <p>
        <code>@mikata/eslint-plugin</code> catches mistakes that TypeScript
        cannot see: setup APIs called from the wrong place, signals read without
        calling them, effects without cleanup, async components, list-wide
        selection subscriptions, and Kit route mistakes.
      </p>

      <h2>Flat config</h2>
      <CodeBlock html={flatConfig} />

      <h2>Kit route rules</h2>
      <p>
        Add these rules for file routes that use actions, loaders, API handlers,
        and redirects.
      </p>
      <CodeBlock html={kitRules} />

      <h2>Recommended rules</h2>
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Catches</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['rules-of-setup', 'Lifecycle, context, and subscription APIs called outside component setup or a reactive scope.'],
            ['no-destructured-props', 'Destructuring props in ways that lose live getter behavior.'],
            ['no-async-component', 'Component functions declared async instead of using loaders, queries, or Suspense.'],
            ['require-effect-cleanup', 'Event listeners, intervals, observers, and similar subscriptions without teardown.'],
            ['no-signal-write-in-computed', 'Signal writes inside computed functions.'],
            ['require-signal-call', 'Using signal functions as values where a signal read was intended.'],
            ['no-signal-assignment', 'Assigning to signal variables instead of calling setters.'],
            ['no-stale-signal-read-in-effect', 'Capturing signal values outside the effect that should track them.'],
            ['prefer-selector-in-each', 'Comparing a shared signal to each() row keys instead of using createSelector().'],
          ].map(([rule, catches]) => (
            <tr>
              <td>
                <code>{rule}</code>
              </td>
              <td>{catches}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Kit-only rules</h2>
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Catches</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>no-discarded-redirect</code>
            </td>
            <td>Calling a redirect helper without returning or throwing its result.</td>
          </tr>
          <tr>
            <td>
              <code>no-api-route-default-export</code>
            </td>
            <td>Mixing a default route component export into API route modules.</td>
          </tr>
        </tbody>
      </table>

      <h2>Tuning severity</h2>
      <p>
        New projects can start with cleanup and prop-destructuring rules as
        warnings while migrating. Rules that can change runtime behavior, such
        as signal writes in computed functions, should stay errors.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/packages/eslint-plugin">@mikata/eslint-plugin reference</Link>
          covers the package entry.
        </li>
        <li>
          <Link to="/core/runtime">Runtime lifecycle</Link> explains setup and
          cleanup.
        </li>
        <li>
          <Link to="/core/reactivity">Reactivity</Link> explains signal reads
          and effects.
        </li>
      </ul>
    </article>
  );
}
