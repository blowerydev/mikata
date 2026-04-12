import type { MikataBaseProps, ClassNamesInput } from '../../types';
import type { LoaderProps } from '../Loader/Loader.types';

export type LoadingOverlayParts = 'root' | 'overlay' | 'loader';

export interface LoadingOverlayProps extends MikataBaseProps {
  /** Whether the overlay is visible */
  visible?: boolean;
  /** Z-index override */
  zIndex?: number;
  /** Background overlay opacity (0-1) */
  overlayBlur?: number;
  /** Props passed to the Loader */
  loaderProps?: LoaderProps;
  classNames?: ClassNamesInput<LoadingOverlayParts>;
}
