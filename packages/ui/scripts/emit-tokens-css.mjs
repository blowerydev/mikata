// Post-build step: generate the flattened token CSS and prepend it to
// `dist/styles.css`. The component rules reference variables like
// `--mkt-color-primary-filled` that only exist after `flattenTheme()`
// runs — shipping them as plain CSS `:root` declarations means the
// browser paints styled components on the very first paint (no
// JS-applied flash) and keeps the imports on the consumer side at a
// single `@mikata/ui/styles.css`.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '..', 'dist');

// The bundled `dist/index.js` has unresolved `__DEV__` references
// because it's meant to be consumed by a downstream bundler (Vite,
// esbuild, etc.) that defines the flag. We're running it directly in
// Node for this build step, so polyfill the flag first.
globalThis.__DEV__ = false;

// `import()` on Windows rejects plain absolute paths ("protocol 'c:'");
// convert to a file:// URL explicitly.
const { flattenTheme } = await import(
  pathToFileURL(resolve(distDir, 'index.js')).href
);

const light = flattenTheme({}, 'light');
const dark = flattenTheme({}, 'dark');

function toBlock(selector, tokens) {
  const lines = Object.entries(tokens)
    .map(([k, v]) => `  --mkt-${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${lines}\n}\n`;
}

const header = [
  '/* @mikata/ui — flattened theme tokens. Emitted by scripts/emit-tokens-css.mjs. */',
  toBlock(':root', light),
  toBlock('[data-mkt-color-scheme="dark"]', dark),
].join('\n');

const stylesPath = resolve(distDir, 'styles.css');
const existing = await readFile(stylesPath, 'utf8');
await writeFile(stylesPath, header + '\n' + existing, 'utf8');

console.log(
  `[ui] prepended ${Object.keys(light).length} light + ${Object.keys(dark).length} dark tokens to dist/styles.css`,
);
