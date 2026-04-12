/**
 * Detect the current color scheme from the nearest ThemeProvider in the DOM.
 * Falls back to 'light' if no ThemeProvider is found.
 *
 * Used by components that render outside the ThemeProvider tree
 * (Toast, Modal, Drawer) to mirror the color scheme attribute.
 */
export function getColorScheme(): 'light' | 'dark' {
  const themed = document.querySelector('[data-mkt-color-scheme]');
  return (themed?.getAttribute('data-mkt-color-scheme') as 'light' | 'dark') ?? 'light';
}

/**
 * Copy the ThemeProvider's CSS custom properties, color scheme, and writing
 * direction onto a portal element that renders outside the ThemeProvider
 * tree (e.g. Modal, Toast, Drawer, Popover). This ensures theming cascades
 * correctly and RTL-aware CSS (`inset-inline-start`, `margin-inline-end`,
 * etc.) resolves to the right physical edge.
 */
export function applyThemeToPortal(el: HTMLElement): void {
  const themed = document.querySelector('[data-mkt-theme]') as HTMLElement | null;
  if (!themed) return;

  const scheme = themed.getAttribute('data-mkt-color-scheme');
  if (scheme) el.setAttribute('data-mkt-color-scheme', scheme);

  const dir = themed.getAttribute('dir');
  if (dir) el.setAttribute('dir', dir);

  const style = themed.style;
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (prop.startsWith('--mkt-')) {
      el.style.setProperty(prop, style.getPropertyValue(prop));
    }
  }
}
