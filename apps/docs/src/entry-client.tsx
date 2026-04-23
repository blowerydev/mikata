import { mount } from '@mikata/kit/client';
import routes, { notFound } from 'virtual:mikata-routes';
import { installThemeVars } from './theme-state';

// @mikata/ui's stylesheet is pulled in via `@import` from `styles.css`
// (which is linked from the HTML head) rather than imported here.
// Importing CSS from a JS module means Vite dev injects it as a
// `<style>` tag after the module executes — which happens after the
// first paint — so the Playground briefly renders with bare native
// controls before the imported styles arrive. The `@import` path
// puts it behind the render-blocking `<link>` Vite already emits,
// so first paint is fully styled.

installThemeVars();

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// `mount` internally preloads every `lazy()` on the initial match chain
// (plus the 404 component) before calling `hydrate()`. No manual
// pre-resolution needed — the old boilerplate here existed only to
// sidestep a hydration bug that now lives in kit itself.
mount(routes, document.getElementById('root')!, { notFound, base });
