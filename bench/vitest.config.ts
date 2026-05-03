import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@mikata/compiler': fileURLToPath(new URL('../packages/compiler/src/index.ts', import.meta.url)),
      '@mikata/form': fileURLToPath(new URL('../packages/form/src/index.ts', import.meta.url)),
      '@mikata/i18n': fileURLToPath(new URL('../packages/i18n/src/index.ts', import.meta.url)),
      '@mikata/icons': fileURLToPath(new URL('../packages/icons/src/index.ts', import.meta.url)),
      '@mikata/kit': fileURLToPath(new URL('../packages/kit/src/index.ts', import.meta.url)),
      '@mikata/reactivity': fileURLToPath(new URL('../packages/reactivity/src/index.ts', import.meta.url)),
      '@mikata/router': fileURLToPath(new URL('../packages/router/src/index.ts', import.meta.url)),
      '@mikata/runtime/jsx-runtime': fileURLToPath(new URL('../packages/runtime/src/jsx-runtime.ts', import.meta.url)),
      '@mikata/runtime': fileURLToPath(new URL('../packages/runtime/src/index.ts', import.meta.url)),
      '@mikata/server': fileURLToPath(new URL('../packages/server/src/index.ts', import.meta.url)),
      '@mikata/store': fileURLToPath(new URL('../packages/store/src/index.ts', import.meta.url)),
      '@mikata/ui': fileURLToPath(new URL('../packages/ui/src/index.ts', import.meta.url)),
    },
  },
  test: {
    root,
    include: ['bench/**/*.bench.ts'],
    environment: 'node',
    globals: false,
  },
  define: {
    __DEV__: 'false',
  },
});
