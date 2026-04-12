import type { MikataBaseProps } from '../../types';

export interface ColorSwatchProps extends MikataBaseProps {
  /** The color to display (any valid CSS color) */
  color: string;
  /** Size in pixels */
  size?: number;
  /** Radius - number = pixels, string = CSS token, 'full' = round */
  radius?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Render with a transparent checker pattern underlay */
  withShadow?: boolean;
  onClick?: (e: MouseEvent) => void;
  children?: Node;
}
