import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type ImageParts = 'root' | 'image' | 'fallback';

export interface ImageProps extends MikataBaseProps {
  /** Image source URL */
  src?: string;
  /** Alt text (required for a11y) */
  alt?: string;
  /** Width (CSS) */
  width?: number | string;
  /** Height (CSS) */
  height?: number | string;
  /** object-fit */
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Border radius */
  radius?: MikataSize | 'full' | number;
  /** Node shown when src is missing or fails to load */
  fallback?: Node;
  classNames?: ClassNamesInput<ImageParts>;
}
