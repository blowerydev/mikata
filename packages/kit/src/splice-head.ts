/**
 * Inject serialised head tags into a template. Prefer an explicit
 * marker; fall back to inserting before `</head>` when absent so apps
 * work without extra template plumbing. If neither exists, the tags are
 * dropped — the caller had no place to put them.
 *
 * Kept free of Vite/Node-specific imports so both the dev middleware
 * and the adapter-node handler can share it without pulling each
 * other's dependencies.
 */
export function spliceHead(template: string, headTags: string, marker: string): string {
  if (!headTags) return template;
  if (template.includes(marker)) return template.replace(marker, headTags);
  const closeHead = template.indexOf('</head>');
  if (closeHead >= 0) {
    return template.slice(0, closeHead) + headTags + template.slice(closeHead);
  }
  return template;
}
