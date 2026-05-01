import { useMeta } from '@mikata/kit/head';
import { Link } from '@mikata/router';
import { CodeBlock, highlight } from '../../components/CodeBlock';

export const nav = { title: 'Persistence', section: 'State & Data', order: 3 };

const persistedExample = await highlight(
  `import { persistedSignal } from '@mikata/persist';

const theme = persistedSignal('theme', 'system', {
  storage: 'local',
  version: 2,
  migrate: (oldValue) => oldValue === 'dark' ? 'dark' : 'system',
});

const [colorScheme, setColorScheme] = theme;

setColorScheme('dark');
await theme.ready;`,
  'ts',
);

const customStorageExample = await highlight(
  `import { indexedDBStorage, persistedSignal } from '@mikata/persist';

const drafts = persistedSignal('drafts', [], {
  storage: indexedDBStorage({
    dbName: 'acme',
    storeName: 'drafts',
  }),
});

await drafts.ready;`,
  'ts',
);

const serializerExample = await highlight(
  `const lastSeen = persistedSignal('last-seen', new Date(0), {
  serialize: (value) => value.toISOString(),
  deserialize: (raw) => new Date(raw),
});`,
  'ts',
);

export default function Persistence() {
  useMeta({
    title: 'Persistence - @mikata/persist',
    description: 'Persist Mikata signals to localStorage, sessionStorage, IndexedDB, or custom storage.',
  });

  return (
    <article>
      <h1>Persistence</h1>
      <p>
        <code>@mikata/persist</code> mirrors a signal into browser storage and
        keeps local-storage values synchronized across tabs. The returned value
        behaves like a signal tuple with a few persistence controls attached.
      </p>

      <h2>Persist a signal</h2>
      <p>
        <code>persistedSignal(key, initialValue, options)</code> returns
        <code>[get, set]</code>, plus <code>ready</code>, <code>clear()</code>,
        and <code>dispose()</code>. The default storage is localStorage.
      </p>
      <CodeBlock html={persistedExample} />

      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Default</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>storage</code>
            </td>
            <td>
              <code>'local'</code>
            </td>
            <td>
              <code>'local'</code>, <code>'session'</code>, or a custom adapter.
            </td>
          </tr>
          <tr>
            <td>
              <code>sync</code>
            </td>
            <td>True for local, false for session.</td>
            <td>Broadcasts changes to other tabs when enabled.</td>
          </tr>
          <tr>
            <td>
              <code>serialize</code>
            </td>
            <td>
              <code>JSON.stringify</code>
            </td>
            <td>Converts values before writing storage.</td>
          </tr>
          <tr>
            <td>
              <code>deserialize</code>
            </td>
            <td>
              <code>JSON.parse</code>
            </td>
            <td>Converts stored strings back into app values.</td>
          </tr>
          <tr>
            <td>
              <code>version</code>
            </td>
            <td>Unset.</td>
            <td>Wraps values as versioned payloads and enables migration.</td>
          </tr>
        </tbody>
      </table>

      <h2>Storage adapters</h2>
      <p>
        Built-in adapters cover localStorage, sessionStorage, and IndexedDB.
        Web-storage adapters are SSR-safe no-ops when storage globals are not
        available. IndexedDB reads are async, so await <code>ready</code> when
        first paint depends on the stored value.
      </p>
      <CodeBlock html={customStorageExample} />

      <h2>Custom values</h2>
      <p>
        Use custom serializers for values JSON cannot restore by itself, such as
        dates, maps, or compact encoded payloads.
      </p>
      <CodeBlock html={serializerExample} />

      <h2>Cross-tab sync</h2>
      <p>
        Local storage uses <code>BroadcastChannel</code> when available and
        falls back to the browser <code>storage</code> event. Remote writes are
        applied without echoing back, so two tabs do not loop updates forever.
      </p>

      <h2>Cleanup</h2>
      <p>
        Call <code>clear()</code> to remove the stored value and reset to the
        initial value. Call <code>dispose()</code> if you create persistent
        signals in short-lived scopes and need to stop cross-tab listeners.
      </p>

      <h2>Where next</h2>
      <ul>
        <li>
          <Link to="/state/stores">Stores</Link> covers non-persistent
          structured state.
        </li>
        <li>
          <Link to="/core/reactivity">Reactivity</Link> explains the signal
          tuple shape that persistence follows.
        </li>
      </ul>
    </article>
  );
}
