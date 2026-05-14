export interface ClampFloatingOptions {
  padding?: number;
}

/**
 * Applies small CSS-variable shifts that keep simple absolute-positioned
 * floating content inside the viewport.
 */
export function clampFloatingElement(
  element: HTMLElement,
  options: ClampFloatingOptions = {},
): () => void {
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
    return () => {};
  }

  const padding = options.padding ?? 8;
  let frame = 0;

  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      let shiftX = 0;
      let shiftY = 0;

      if (rect.left < padding) shiftX = padding - rect.left;
      else if (rect.right > window.innerWidth - padding) {
        shiftX = window.innerWidth - padding - rect.right;
      }

      if (rect.top < padding) shiftY = padding - rect.top;
      else if (rect.bottom > window.innerHeight - padding) {
        shiftY = window.innerHeight - padding - rect.bottom;
      }

      element.style.setProperty('--mkt-floating-shift-x', `${shiftX}px`);
      element.style.setProperty('--mkt-floating-shift-y', `${shiftY}px`);
    });
  };

  update();
  window.addEventListener('resize', update);
  window.addEventListener('scroll', update, true);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', update);
    window.removeEventListener('scroll', update, true);
    element.style.removeProperty('--mkt-floating-shift-x');
    element.style.removeProperty('--mkt-floating-shift-y');
  };
}
