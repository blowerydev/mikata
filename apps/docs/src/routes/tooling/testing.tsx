import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Testing', section: 'Tooling', order: 4 };

const install = await highlight(
  `pnpm add -D vitest jsdom @mikata/testing`,
  'shell',
);

const packageJson = await highlight(
  `{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}`,
  'json',
);

const componentTest = await highlight(
  `import { describe, expect, it } from 'vitest';
import { renderComponent, fireEvent, waitForUpdate } from '@mikata/testing';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments after a click', async () => {
    const view = renderComponent(Counter, { initial: 0 });

    fireEvent.click(view.get('button'));
    await waitForUpdate();

    expect(view.text()).toContain('1');
    view.dispose();
  });
});`,
  'ts',
);

const providerTest = await highlight(
  `import { renderComponent, flush } from '@mikata/testing';
import { provideRouter, createTestRouter } from '@mikata/router';
import { ThemeProvider } from '@mikata/ui';
import { App } from './App';

const router = createTestRouter({
  routes: [{ path: '/', component: App }],
});

const view = renderComponent(() => {
  provideRouter(router);
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}, {});

flush();
view.dispose();`,
  'tsx',
);

export default function TestingTooling() {
  useMeta({
    title: 'Testing - Mikata tooling',
    description: 'Test Mikata components with Vitest, jsdom, render helpers, events, and reactive flushing.',
  });

  return (
    <article>
      <h1>Testing</h1>
      <p>
        Mikata tests usually run in Vitest with jsdom. The
        <code>@mikata/testing</code> package wraps the runtime renderer with
        ergonomic query helpers, event helpers, and update flushing.
      </p>

      <h2>Install</h2>
      <CodeBlock html={install} />
      <CodeBlock html={packageJson} />

      <h2>Basic component test</h2>
      <p>
        <code>renderComponent()</code> appends a detached container to
        <code>document.body</code>, renders the component, and returns helpers
        for querying and cleanup.
      </p>
      <CodeBlock html={componentTest} />

      <h2>Testing with providers</h2>
      <p>
        For router, theme, i18n, or other context providers, render a small test
        wrapper component and call the provider setup before returning children.
      </p>
      <CodeBlock html={providerTest} />

      <h2>Testing APIs</h2>
      <table>
        <thead>
          <tr>
            <th>API</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>renderComponent(Component, props?)</code>
            </td>
            <td>Mounts a component and returns query helpers plus <code>dispose()</code>.</td>
          </tr>
          <tr>
            <td>
              <code>renderContent(fn)</code>
            </td>
            <td>Mounts arbitrary DOM-producing content.</td>
          </tr>
          <tr>
            <td>
              <code>fireEvent.click/input/change/keyDown</code>
            </td>
            <td>Dispatches browser-shaped events and updates input values before dispatch.</td>
          </tr>
          <tr>
            <td>
              <code>waitForUpdate()</code>
            </td>
            <td>Runs <code>flushSync()</code>, then awaits one microtask.</td>
          </tr>
          <tr>
            <td>
              <code>flush()</code>
            </td>
            <td>Synchronously flushes pending reactive work.</td>
          </tr>
        </tbody>
      </table>

      <h2>Query helpers</h2>
      <p>
        The render result includes <code>get()</code>, <code>query()</code>,
        <code>getAll()</code>, <code>findByText()</code>, <code>text()</code>,
        and <code>html()</code>. <code>get()</code> throws with the container
        HTML when nothing matches, which makes failed assertions easier to read.
      </p>

      <h2>Common patterns</h2>
      <ul>
        <li>Always call <code>dispose()</code> when a test creates long-lived effects.</li>
        <li>Use <code>waitForUpdate()</code> after events that schedule async work.</li>
        <li>Use <code>flush()</code> when you only need synchronous signal updates.</li>
        <li>Use <code>createTestRouter()</code> for memory-history router tests.</li>
      </ul>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/packages/testing">@mikata/testing reference</Link> lists
          the helpers.
        </li>
        <li>
          <Link to="/packages/router">@mikata/router reference</Link> includes
          router test helpers.
        </li>
        <li>
          <Link to="/tooling/eslint">ESLint plugin</Link> adds test-time
          guardrails for cleanup and signals.
        </li>
      </ul>
    </article>
  );
}
