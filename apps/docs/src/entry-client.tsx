import { mount } from '@mikata/kit/client';
import routes, { notFound } from 'virtual:mikata-routes';
import '@mikata/ui/styles.css';
import { installThemeVars } from './theme-state';

installThemeVars();

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// `mount` internally preloads every `lazy()` on the initial match chain
// (plus the 404 component) before calling `hydrate()`. No manual
// pre-resolution needed — the old boilerplate here existed only to
// sidestep a hydration bug that now lives in kit itself.
mount(routes, document.getElementById('root')!, { notFound, base });
