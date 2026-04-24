import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // apps/docs has its own vitest.config.ts with the @mikata/compiler
    // plugin wired in; those tests import `.tsx` components that rely
    // on the plugin's JSX transform. Root runs them via a dedicated
    // `test:docs` script instead of discovering them here, so the root
    // config stays plugin-free for everything else.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'apps/docs/**',
    ],
  },
  define: {
    __DEV__: 'true',
  },
});
