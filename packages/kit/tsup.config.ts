import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/plugin.ts',
    'src/client.ts',
    'src/server.ts',
    'src/loader.ts',
    'src/action.ts',
    'src/form.ts',
    'src/head.ts',
    'src/api.ts',
    'src/cookies.ts',
    'src/session.ts',
    'src/session-browser.ts',
    'src/csrf.ts',
    'src/csrf-server.ts',
    'src/adapter-node.ts',
    'src/adapter-edge.ts',
    'src/prerender.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['vite'],
});
