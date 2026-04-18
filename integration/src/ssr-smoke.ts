/**
 * SSR smoke test runnable from the CLI via `pnpm dev:ssr`.
 *
 * Builds a tiny component tree using the same runtime primitives the
 * compiler emits, renders it to HTML with `@mikata/server`, and prints
 * the full response (HTML + hydration state) to stdout. This proves the
 * SSR pipeline end-to-end in a real Node process, outside the vitest
 * environment, without requiring any Vite/Babel wiring.
 */

// Compiled runtime references `__DEV__` — Vite/Vitest define it at build
// time, but a bare Node process doesn't. Declare it before the first import
// so `_createComponent` etc. see a valid boolean.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

import { signal } from '@mikata/reactivity';
import {
  _template,
  _insert,
  _delegate,
  _createComponent,
  show,
} from '@mikata/runtime';
import { renderToString } from '@mikata/server';
import { createQuery } from '@mikata/store';

function Greeting(props: { name: string }) {
  const root = _template('<h1>Hello, <!>!</h1>').cloneNode(true) as any;
  const marker = root.childNodes[1];
  _insert(root, () => props.name, marker);
  return root;
}

function Counter() {
  const [count, setCount] = signal(0);
  const root = _template('<button>count: <!>!</button>').cloneNode(true) as any;
  const marker = root.childNodes[1];
  _insert(root, () => count(), marker);
  _delegate(root, 'click', () => setCount(count() + 1));
  return root;
}

function App() {
  const [showExtra] = signal(true);
  const query = createQuery({
    key: () => 'user:42',
    fn: async () => ({ name: 'Ada Lovelace' }),
  });

  const root = _template('<main></main>').cloneNode(true) as any;
  _insert(root, () => _createComponent(Greeting, { name: query.data()?.name ?? 'World' }));
  _insert(root, () => _createComponent(Counter, {}));
  _insert(root, () =>
    show(
      showExtra,
      () => _template('<p>Rendered on the server — hydrate to interact.</p>').cloneNode(true),
      () => null,
    ),
  );
  return root;
}

async function main() {
  const start = Date.now();
  const { html, stateScript, state } = await renderToString(() => _createComponent(App, {}));
  const elapsedMs = Date.now() - start;

  const doc = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Mikata SSR smoke</title>
  </head>
  <body>
    <div id="root">${html}</div>
    ${stateScript}
  </body>
</html>`;

  process.stdout.write(doc);
  process.stdout.write('\n\n');
  process.stderr.write(`SSR rendered ${html.length} bytes in ${elapsedMs}ms\n`);
  process.stderr.write(`hydration state keys: ${JSON.stringify(Object.keys(state))}\n`);
}

main().catch((err) => {
  process.stderr.write(`SSR smoke failed: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
