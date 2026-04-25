import { mount } from '@mikata/kit/client';
import * as manifest from 'virtual:mikata-routes';
import { installThemeVars } from './theme-state';

// Stylesheets are linked via mikataKit's `css` option (vite.config.ts),
// so nothing is imported here - importing CSS from an entry module would
// defer styles behind module execution and flash on first paint in dev.
// The inline color-scheme script (also plugin-injected) has already set
// the attribute on <html> by the time this runs; `installThemeVars`
// takes over reactive updates.

installThemeVars();

// `mount` internally preloads every `lazy()` on the initial match chain
// (plus the 404 component) before calling `hydrate()`. Passing the
// manifest namespace lets it read `notFound` and `base` directly - no
// per-entry plumbing of `import.meta.env.BASE_URL` or named imports.
//
// `defer: 'css'` waits for every linked stylesheet to finish loading
// before adopting the SSR markup. In Vite dev the JS bundle outraces
// the docs stylesheet, so any component that measures layout on first
// paint (a sliding indicator, a virtualised list reading offsetTop)
// would otherwise read pre-CSS values. Production bundles inline the
// critical CSS so this resolves on the same tick.
mount(manifest, document.getElementById('root')!, { defer: 'css' });
