import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';
import { mikataKit } from '@mikata/kit';

export default defineConfig({
  base: '/mikata/',
  // ESNext lets us use top-level await in route modules - each docs page
  // pre-highlights its code blocks with `await highlight(...)` so Shiki
  // runs at build time only. Browsers we care about all support TLA.
  build: { target: 'esnext' },
  plugins: [
    mikata(),
    mikataKit({ prerender: true }),
  ],
});
