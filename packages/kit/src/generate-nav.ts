/**
 * Serialise discovered `nav` exports into the source of a
 * `virtual:mikata-nav` module. The emitted module exports a flat,
 * source-order-stable array of `NavEntry` objects with a guaranteed
 * `path` field on every item.
 *
 * Per-route discovery happens in the plugin (it reads each source for
 * the API-routes pass anyway); this generator is a pure
 * `(navByFile, manifest) → moduleSource` mapping so the shape stays
 * unit-testable without filesystem IO.
 *
 * Resolution rules:
 *   - A route exports a single `NavEntry` → `path` is filled in from
 *     the route's auto-derived `path` (the manifest entry's `path`).
 *   - A route exports `NavEntry[]` (dynamic routes, where one source
 *     file maps to many concrete URLs) → each entry must carry its own
 *     `path`. Entries missing `path` are dropped with a build-time
 *     console warning rather than producing a broken nav link.
 */

import type { NavEntry, RouteManifest } from './scan-routes';

export interface GenerateNavOptions {
  manifest: RouteManifest;
  /**
   * Map of route file (POSIX path relative to the routes directory) to
   * the value extracted from that file's `export const nav = ...`. The
   * value is whatever `extractNavExport` returned - an object, an
   * array, or `null` (which the caller filters out before passing).
   */
  navByFile: ReadonlyMap<string, NavEntry | NavEntry[]>;
}

export interface GeneratedNav {
  /** Module source. Default-exports the nav array. */
  source: string;
  /** Resolved entries (returned for testability / introspection). */
  entries: readonly NavEntry[];
}

export function generateNavModule(opts: GenerateNavOptions): GeneratedNav {
  const { manifest, navByFile } = opts;
  const pathByFile = new Map<string, string>();
  for (const route of manifest.routes) pathByFile.set(route.file, route.path);

  const entries: NavEntry[] = [];
  // Iterate in scanner-stable file order so the emitted array is
  // deterministic across builds.
  const orderedFiles = manifest.routes.map((r) => r.file);
  for (const file of orderedFiles) {
    const raw = navByFile.get(file);
    if (!raw) continue;
    if (Array.isArray(raw)) {
      for (const entry of raw) {
        if (typeof entry?.path !== 'string') {
          // eslint-disable-next-line no-console
          console.warn(
            `[mikata-kit] nav entry in ${file} is missing required \`path\` (array form). Skipping.`,
          );
          continue;
        }
        entries.push({ ...entry });
      }
    } else {
      const path = raw.path ?? pathByFile.get(file);
      if (typeof path !== 'string') continue;
      entries.push({ ...raw, path });
    }
  }

  // No global sort: section ordering is the consumer's concern (they
  // own the canonical section list), and within a section the consumer
  // sorts by `order` after grouping. Emitting in scanner source order
  // gives consumers a deterministic baseline.

  const literal = JSON.stringify(entries, null, 2);
  const source =
    `export const nav = ${literal};\n` +
    `export default nav;\n`;

  return { source, entries };
}
