import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';
import { mikataKit } from '@mikata/kit';

export default defineConfig({
  base: '/mikata/',
  // ESNext lets us use top-level await in route modules - each docs page
  // pre-highlights its code blocks with `await highlight(...)` so Shiki
  // runs at build time only. Browsers we care about all support TLA.
  build: { target: 'esnext' },
  // Skip Vite's dep pre-bundler for workspace packages. Pre-bundling
  // snapshots the package's `dist/` at dev-server start and serves that
  // snapshot for the session; rebuilding a workspace package later
  // leaves the snapshot stale (empty bundle, missing exports, etc) and
  // only a `.vite` cache wipe + server restart picks it up. Excluding
  // them routes the requests through Vite's normal module graph which
  // watches the files and invalidates on change.
  optimizeDeps: {
    exclude: [
      '@mikata/compiler',
      '@mikata/icons',
      '@mikata/kit',
      '@mikata/reactivity',
      '@mikata/router',
      '@mikata/runtime',
      '@mikata/server',
      '@mikata/store',
      '@mikata/ui',
    ],
  },
  plugins: [
    mikata(),
    mikataKit({ prerender: true }),
  ],
});
