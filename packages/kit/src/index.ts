/**
 * @mikata/kit — meta-framework for Mikata.
 *
 * The default entry re-exports the public surface from the sub-entries
 * so importing `@mikata/kit` gives you everything; dedicated sub-paths
 * (`/plugin`, `/client`, `/server`) exist so bundlers can split the
 * Vite / browser / Node code apart without pulling each other's deps.
 */

/**
 * Main entry — Node-safe surface only. This is the module Vite's config
 * loader pulls in, so any runtime-DOM or `@mikata/server` code must stay
 * on a sub-entry to avoid cascading into the config load (which runs
 * before Vite has a chance to define `__DEV__` and friends).
 *
 *   vite.config.ts        →  `@mikata/kit`          (plugin + scanner)
 *   src/entry-client.tsx  →  `@mikata/kit/client`   (mount, hydrate path)
 *   src/entry-server.tsx  →  `@mikata/kit/server`   (renderRoute)
 */
export { default as mikataKit } from './plugin';
export type { MikataKitOptions } from './plugin';
export type { ColorSchemeInitOptions, PreHydrationScript } from './html-setup';
export type { RouteManifest, RouteManifestEntry, NavEntry } from './scan-routes';

export { scanRoutes, extractNavExport } from './scan-routes';
export { generateManifestModule } from './generate-manifest';
export { generateNavModule } from './generate-nav';

// NOTE: the loader API (`useLoaderData`, `provideLoaderData`,
// `LoadContext`) lives at `@mikata/kit/loader`. Keeping it off the
// root entry avoids pulling `@mikata/runtime` (which references
// `__DEV__`) into Vite's config loader when apps do
// `import { mikataKit } from '@mikata/kit'` from `vite.config.ts`.
