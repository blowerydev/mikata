import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';
import { mikataKit } from '@mikata/kit';

export default defineConfig({
  plugins: [
    mikata(),
    // Pass `prerender: true` to `mikataKit` (or an options object) to
    // generate a static site into `dist/static/` after the SSR build.
    // Parametric routes (`posts/[id].tsx`) should add a `getStaticPaths`
    // export. See @mikata/kit/prerender for details.
    mikataKit(),
  ],
});
