import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/plugin.ts',
    'src/client.ts',
    'src/server.ts',
    'src/loader.ts',
    'src/adapter-node.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['vite'],
});
