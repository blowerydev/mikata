import type { MikataSize, MikataBaseProps } from '../../types';

export interface CloseButtonProps extends MikataBaseProps {
  size?: MikataSize;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
  'aria-label'?: string;
}
