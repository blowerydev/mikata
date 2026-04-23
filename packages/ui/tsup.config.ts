import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/styles.ts'],
  format: ['esm', 'cjs'],
  dts: { entry: 'src/index.ts' },
  clean: true,
  treeshake: true,
  esbuildOptions(options) {
    options.bundle = true;
  },
  // After the JS + CSS are written, flatten the theme tokens and
  // prepend them to dist/styles.css. Without this, component rules
  // that reference semantic vars (--mkt-color-primary-filled, ...)
  // have nothing to resolve against on first paint and the user sees
  // unstyled content until `installThemeVars()` runs post-hydration.
  onSuccess: 'node scripts/emit-tokens-css.mjs',
});
