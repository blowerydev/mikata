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
    mikataKit({
      prerender: true,
      // Render-blocking link to both @mikata/ui's stylesheet (re-exported
      // via styles.css's @import - see comment there) and our app sheet.
      // Declared here instead of imported from entry-client.tsx to dodge
      // Vite dev's deferred-style-tag injection, which hits first paint
      // unstyled.
      css: '/src/styles.css',
      // Inline script in <head> resolves the stored theme (or system
      // preference) synchronously before CSS paints, so dark-mode users
      // don't flash white while the JS bundle loads. `theme-state.ts`
      // writes to the same storage key.
      colorSchemeInit: { storageKey: 'mikata-docs-theme' },
    }),
  ],
});
