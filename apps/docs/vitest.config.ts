import { defineConfig } from 'vitest/config';
import mikata from '@mikata/compiler';

// Local config so JSX test files get the Mikata transform - importing
// Playground.tsx into a `.tsx` test requires the same Babel pass that
// prod builds use. Root vitest.config.ts has no plugins, so per-app
// configs stay opt-in instead of leaking JSX semantics monorepo-wide.
export default defineConfig({
  plugins: [mikata()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  define: {
    __DEV__: 'true',
  },
});
