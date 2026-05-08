export function formatValue(value: unknown): string {
  if (value === undefined) return '<span style="color:#666">undefined</span>';
  if (value === null) return '<span style="color:#666">null</span>';
  if (typeof value === 'string') return `"${escapeHtml(value.length > 40 ? value.slice(0, 40) + '...' : value)}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'function') return '<span style="color:#c084fc">fn</span>';
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return `{${Object.keys(value as object).length}}`;
  return String(value);
}

export function formatValueFull(value: unknown): string {
  try {
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return String((value as { name?: string }).name ?? 'fn');
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatMs(ms: number | undefined): string {
  if (ms == null) return '-';
  if (ms < 0.05) return '<0.1ms';
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  return `${Math.round(ms)}ms`;
}

export function timeSince(t: number): string {
  const delta = performance.now() - t;
  if (delta < 1000) return `${Math.round(delta)}ms`;
  if (delta < 60_000) return `${(delta / 1000).toFixed(1)}s`;
  return `${Math.round(delta / 60_000)}m`;
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
