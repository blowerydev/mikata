import { mount } from '@mikata/kit/client';
import routes, { notFound } from 'virtual:mikata-routes';
import { installThemeVars } from './theme-state';

// Stylesheets are linked via mikataKit's `css` option (vite.config.ts),
// so nothing is imported here - importing CSS from an entry module would
// defer styles behind module execution and flash on first paint in dev.
// The inline color-scheme script (also plugin-injected) has already set
// the attribute on <html> by the time this runs; `installThemeVars`
// takes over reactive updates.

installThemeVars();

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// `mount` internally preloads every `lazy()` on the initial match chain
// (plus the 404 component) before calling `hydrate()`. No manual
// pre-resolution needed — the old boilerplate here existed only to
// sidestep a hydration bug that now lives in kit itself.
mount(routes, document.getElementById('root')!, { notFound, base });
