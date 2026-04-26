/**
 * Section ordering for the docs sidebar.
 *
 * Pages declare their section by name in their `export const nav`. The
 * order in this list controls which section comes first; pages with a
 * `section` value not present here are dropped from the sidebar (the
 * common cause is a typo - the warning falls out of the missing entry).
 *
 * Add a new section here and any page assigned to it (via its `nav`
 * export) shows up automatically. There is no second list of pages to
 * keep in sync.
 */
export const sections = [
  'Start',
  'Core Concepts',
  'App Framework',
  'State & Data',
  'UI',
  'Tooling',
  'FAQ',
  'Packages',
] as const;

export type SectionName = (typeof sections)[number];
