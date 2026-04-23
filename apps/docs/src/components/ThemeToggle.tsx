import { colorSchemeSignal, setColorScheme } from '../theme-state';

/**
 * Segmented-control-style theme toggle. Written as three inline buttons
 * rather than an `each()` loop because `each()` builds its output in a
 * DocumentFragment via `document.createDocumentFragment()`, which is
 * not hydration-aware: on the client the fragment never replaces the
 * SSR-rendered items, so handlers never attach. Plain JSX with siblings
 * goes through the compiler's `_template` + hydration cursor, which
 * adopts the server-rendered buttons in place.
 */
export function ThemeToggle() {
  const scheme = colorSchemeSignal();
  return (
    <div class="theme-toggle" role="radiogroup" aria-label="Theme">
      <button
        type="button"
        role="radio"
        aria-checked={scheme() === 'light' ? 'true' : 'false'}
        data-active={scheme() === 'light' ? '' : undefined}
        onClick={() => setColorScheme('light')}
      >
        Light
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scheme() === 'auto' ? 'true' : 'false'}
        data-active={scheme() === 'auto' ? '' : undefined}
        onClick={() => setColorScheme('auto')}
      >
        Auto
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scheme() === 'dark' ? 'true' : 'false'}
        data-active={scheme() === 'dark' ? '' : undefined}
        onClick={() => setColorScheme('dark')}
      >
        Dark
      </button>
    </div>
  );
}
