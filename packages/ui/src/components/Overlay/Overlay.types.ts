import type { MikataBaseProps } from '../../types';

export interface OverlayProps extends MikataBaseProps {
  /** Backdrop color (any CSS color). Default `#000`. */
  color?: string;
  /** Opacity 0–1. Default 0.6. */
  opacity?: number;
  /** Gaussian blur, in px, applied to the backdrop's backdrop-filter. Default 0. */
  blur?: number;
  /** Position. `absolute` inside the nearest positioned ancestor, `fixed` covers the viewport. Default `absolute`. */
  fixed?: boolean;
  /** Custom z-index. Default `var(--mkt-z-overlay)`. */
  zIndex?: number | string;
  /** Border radius (px or CSS) applied to the overlay */
  radius?: number | string;
  /** Optional content rendered on top of the dim layer (centered) */
  children?: Node;
  /** Click handler on the overlay itself (often used to close) */
  onClick?: (e: MouseEvent) => void;
}
