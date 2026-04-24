/**
 * Tag descriptors for the plugin's `transformIndexHtml` hook.
 *
 * Two concerns covered here, both sharp enough to trip every app that
 * doesn't know the workaround:
 *
 *   1. Color-scheme resolution must happen *before* CSS paints. Otherwise
 *      a user on system-dark with a stored `auto` preference sees a white
 *      flash while the JS bundle loads and calls `applyThemeToDocument`.
 *      Every SSR framework solves this with an inline `<script>` in
 *      `<head>` that synchronously reads localStorage + matchMedia and
 *      sets the attribute. This file produces that script.
 *
 *   2. CSS imported from JS (the canonical `import './styles.css'` in
 *      `entry-client.tsx`) is injected by Vite as a `<style>` tag *after*
 *      module execution in dev - which happens after first paint. Render-
 *      blocking `<link>` tags dodge the flash. This file produces those
 *      link descriptors so users declare CSS via the plugin and skip the
 *      JS import.
 */

export interface ColorSchemeInitOptions {
  /**
   * localStorage key the script reads the user's saved preference from.
   * The same key must be used by the app's theme-toggle UI when writing.
   * Default: `'mikata-color-scheme'`.
   */
  storageKey?: string;
  /**
   * Attribute written to `<html>`. `@mikata/ui`'s component styles read
   * `data-mkt-color-scheme`, which is the default; pass a custom value if
   * your app uses a different convention.
   */
  attribute?: string;
  /**
   * Value used when neither localStorage nor `matchMedia` resolves (e.g.
   * a browser with storage blocked and no media-query support). Default:
   * `'light'`.
   */
  fallback?: 'light' | 'dark';
}

const DEFAULT_STORAGE_KEY = 'mikata-color-scheme';
const DEFAULT_ATTRIBUTE = 'data-mkt-color-scheme';
const DEFAULT_FALLBACK = 'light';

/**
 * Inline `<script>` body for `<head>`. Kept small - this is parser-blocking
 * content between `<head>` open and the first CSS `<link>`, so every byte
 * is on the critical path.
 *
 * The quotes around each interpolated value come from `JSON.stringify`, so
 * a storage key with a quote or newline stays safe when the caller mis-reads
 * the docs and passes something exotic.
 */
export function buildColorSchemeInitScript(
  options: ColorSchemeInitOptions = {},
): string {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const attribute = options.attribute ?? DEFAULT_ATTRIBUTE;
  const fallback = options.fallback ?? DEFAULT_FALLBACK;
  const keyLit = JSON.stringify(storageKey);
  const attrLit = JSON.stringify(attribute);
  const fallbackLit = JSON.stringify(fallback);
  return (
    `(function(){try{` +
    `var s=localStorage.getItem(${keyLit});` +
    `var r=s==='light'||s==='dark'?s:` +
    `(typeof matchMedia!=='undefined'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');` +
    `document.documentElement.setAttribute(${attrLit},r);` +
    `}catch(_){document.documentElement.setAttribute(${attrLit},${fallbackLit});}})();`
  );
}

/**
 * Normalize a user-supplied CSS entry to the shape `<link href>` expects.
 * Accepts:
 *   - `'/src/styles.css'`  → used verbatim (Vite absolute-from-root)
 *   - `'src/styles.css'`   → prefixed with `/`
 *   - `'./src/styles.css'` → stripped to `/src/styles.css`
 *
 * Anything that already looks like a URL (http:, https:, //) is passed
 * through untouched, so users can link a CDN stylesheet the same way.
 */
export function normalizeCssHref(href: string): string {
  if (/^(?:https?:)?\/\//.test(href)) return href;
  if (href.startsWith('/')) return href;
  if (href.startsWith('./')) return '/' + href.slice(2);
  return '/' + href;
}
