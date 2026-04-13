import { defineConfig } from 'vitest/config';
import mikata from '@mikata/compiler';

export default defineConfig({
  plugins: [mikata()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
