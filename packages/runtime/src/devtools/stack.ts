export interface ParsedFrame {
  /** Original frame line, unchanged. */
  raw: string;
  /** URL or file path of the source, or null if the line is not parsable. */
  file: string | null;
  line: number;
  column: number;
}

const FRAME_URL_RE = /((?:https?:\/\/|file:\/\/|\/)[^\s()]+?):(\d+):(\d+)/;

/** @internal - exported for tests. */
export function parseStackFrames(stack: string): ParsedFrame[] {
  if (!stack) return [];
  return stack.split('\n').map((raw) => {
    const line = raw.trim();
    const m = FRAME_URL_RE.exec(line);
    if (!m) return { raw: line, file: null, line: 0, column: 0 };
    return { raw: line, file: m[1], line: Number(m[2]), column: Number(m[3]) };
  });
}

export function shortenFrame(frame: ParsedFrame): string {
  if (!frame.file) return frame.raw;
  let path = frame.file;
  try {
    const u = new URL(frame.file);
    path = u.pathname;
  } catch {
    // Not an absolute URL - keep as-is.
  }
  path = path.replace(/\?.*$/, '');
  const parts = path.split('/').filter(Boolean);
  const tail = parts.slice(-3).join('/');
  return `${tail}:${frame.line}:${frame.column}`;
}

export async function openSource(frame: ParsedFrame): Promise<void> {
  if (!frame.file) return;
  const q = new URLSearchParams({
    file: frame.file,
    line: String(frame.line),
    column: String(frame.column),
  }).toString();
  try {
    const res = await fetch(`/__open-in-editor?${q}`, { method: 'GET' });
    if (res.ok) return;
  } catch {
    // Endpoint unavailable - fall through.
  }
  // eslint-disable-next-line no-console
  console.log(`[mikata:devtools] source at ${frame.file}:${frame.line}:${frame.column}`);
  try {
    window.open(frame.file, '_blank', 'noopener');
  } catch {
    /* noop */
  }
}
