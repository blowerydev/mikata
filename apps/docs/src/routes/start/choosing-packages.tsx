import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Choosing packages', section: 'Start', order: 7 };

const umbrella = await highlight(
  `import {
  signal,
  render,
  show,
  each,
  createRouter,
  createQuery,
  createForm,
} from 'mikata';`,
  'tsx',
);

const focused = await highlight(
  `import { signal, computed } from '@mikata/reactivity';
import { render, show, each } from '@mikata/runtime';
import { createRouter } from '@mikata/router';
import { Button } from '@mikata/ui';`,
  'tsx',
);

export default function ChoosingPackages() {
  useMeta({
    title: 'Choosing packages - Mikata',
    description: 'Choose between the Mikata umbrella package and focused packages.',
  });

  return (
    <article>
      <h1>Choosing packages</h1>
      <p>
        Most apps can start with <code>mikata</code>. It re-exports the common
        runtime, reactivity, router, store, form, i18n, and icon helpers so you
        can build without memorizing package boundaries. Use focused packages
        when you are building a library, trimming dependencies, or documenting a
        specific layer.
      </p>

      <h2>Use the umbrella package for apps</h2>
      <p>
        The generated app examples import from <code>mikata</code> because it
        keeps copy-paste examples simple and covers the most common app APIs.
      </p>
      <CodeBlock html={umbrella} />

      <h2>Use focused packages for boundaries</h2>
      <p>
        Focused imports make dependencies explicit. They are a better fit for
        packages, framework internals, or apps that want to keep optional
        features out of a particular bundle.
      </p>
      <CodeBlock html={focused} />

      <h2>Decision matrix</h2>
      <table>
        <thead>
          <tr>
            <th>Need</th>
            <th>Package</th>
            <th>Scaffold flag</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Signals, computed values, effects, scopes</td>
            <td>
              <code>mikata</code> or <code>@mikata/reactivity</code>
            </td>
            <td>Included in every template</td>
          </tr>
          <tr>
            <td>DOM rendering, JSX helpers, control flow, context</td>
            <td>
              <code>mikata</code> or <code>@mikata/runtime</code>
            </td>
            <td>Included in every template</td>
          </tr>
          <tr>
            <td>Client-side routing without SSR</td>
            <td>
              <code>mikata</code> or <code>@mikata/router</code>
            </td>
            <td>
              <code>--router</code>
            </td>
          </tr>
          <tr>
            <td>File routes, SSR, metadata, API routes</td>
            <td>
              <code>@mikata/kit</code>
            </td>
            <td>
              <code>--kit</code>
            </td>
          </tr>
          <tr>
            <td>Design-system components and themes</td>
            <td>
              <code>@mikata/ui</code>
            </td>
            <td>
              <code>--ui</code>
            </td>
          </tr>
          <tr>
            <td>SVG icons</td>
            <td>
              <code>mikata</code> for <code>createIcon</code>,{' '}
              <code>@mikata/icons</code> for named icons
            </td>
            <td>
              <code>--icons</code>
            </td>
          </tr>
          <tr>
            <td>Query and mutation state</td>
            <td>
              <code>mikata</code> or <code>@mikata/store</code>
            </td>
            <td>
              <code>--store</code>
            </td>
          </tr>
          <tr>
            <td>Storage-backed signals</td>
            <td>
              <code>@mikata/persist</code>
            </td>
            <td>
              <code>--persist</code>
            </td>
          </tr>
          <tr>
            <td>Forms and validation</td>
            <td>
              <code>mikata</code> or <code>@mikata/form</code>
            </td>
            <td>
              <code>--form</code>
            </td>
          </tr>
          <tr>
            <td>ICU messages and reactive locale</td>
            <td>
              <code>mikata</code> or <code>@mikata/i18n</code>
            </td>
            <td>
              <code>--i18n</code>
            </td>
          </tr>
          <tr>
            <td>Vitest render helpers and events</td>
            <td>
              <code>@mikata/testing</code>
            </td>
            <td>
              <code>--testing</code>
            </td>
          </tr>
          <tr>
            <td>Lint rules for Mikata code</td>
            <td>
              <code>@mikata/eslint-plugin</code>
            </td>
            <td>
              <code>--eslint</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Starter recommendations</h2>
      <ul>
        <li>
          Choose <code>--template minimal</code> for learning signals and JSX
          without routing.
        </li>
        <li>
          Choose <code>--template spa</code> for a browser-rendered app with
          explicit routes and tests.
        </li>
        <li>
          Choose <code>--template ssr</code> for file routes, server rendering,
          and future deployment work.
        </li>
        <li>
          Add <code>--ui</code> when you want Mikata components instead of
          writing app styling from scratch.
        </li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/start/create-project">Create a project</Link> shows the
          exact scaffold commands.
        </li>
        <li>
          <Link to="/packages/mikata">Package reference</Link> lists what the
          umbrella package exports.
        </li>
        <li>
          <Link to="/ui/overview">UI overview</Link> is the next stop if your
          project selected <code>--ui</code>.
        </li>
      </ul>
    </article>
  );
}
