import { onCleanup } from '@mikata/reactivity';

export type HotkeyHandler = (event: KeyboardEvent) => void;
export type HotkeyMap = Record<string, HotkeyHandler>;

/**
 * Parse `"mod+shift+k"` into the modifier flags + the primary key.
 * `mod` maps to Meta on Mac, Ctrl elsewhere.
 */
interface ParsedHotkey {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  mod: boolean;
}

function parseHotkey(combo: string): ParsedHotkey {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const parsed: ParsedHotkey = {
    key: '',
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    mod: false,
  };
  for (const part of parts) {
    if (part === 'ctrl') parsed.ctrl = true;
    else if (part === 'shift') parsed.shift = true;
    else if (part === 'alt' || part === 'option') parsed.alt = true;
    else if (part === 'meta' || part === 'cmd') parsed.meta = true;
    else if (part === 'mod') parsed.mod = true;
    else parsed.key = part;
  }
  return parsed;
}

function matches(parsed: ParsedHotkey, event: KeyboardEvent): boolean {
  const isMac = /Mac|iP(hone|od|ad)/.test(navigator.platform);
  const modActive = isMac ? event.metaKey : event.ctrlKey;
  const modRequired = parsed.mod;

  if (modRequired && !modActive) return false;
  if (!modRequired) {
    if (parsed.ctrl !== event.ctrlKey) return false;
    if (parsed.meta !== event.metaKey) return false;
  }
  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.alt !== event.altKey) return false;

  return event.key.toLowerCase() === parsed.key;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * Bind global keyboard shortcuts. Cleaned up on scope disposal.
 *
 * Usage:
 *   onHotkeys({
 *     'mod+k': () => openCommandPalette(),
 *     'Escape': () => close(),
 *   });
 */
export function onHotkeys(
  map: HotkeyMap,
  options?: { allowInInputs?: boolean }
): void {
  const entries = Object.entries(map).map(([combo, handler]) => ({
    parsed: parseHotkey(combo),
    handler,
  }));

  const listener = (event: KeyboardEvent) => {
    if (!options?.allowInInputs && isEditable(event.target)) return;
    for (const { parsed, handler } of entries) {
      if (matches(parsed, event)) {
        handler(event);
        return;
      }
    }
  };

  document.addEventListener('keydown', listener);
  onCleanup(() => document.removeEventListener('keydown', listener));
}
