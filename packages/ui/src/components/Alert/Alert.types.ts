import type { MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type AlertVariant = 'filled' | 'light' | 'outline';
export type AlertParts = 'root' | 'title' | 'message' | 'icon' | 'closeButton';

export interface AlertProps extends MikataBaseProps {
  variant?: AlertVariant;
  color?: MikataColor;
  title?: string;
  icon?: () => Node;
  closable?: boolean;
  onClose?: () => void;
  classNames?: ClassNamesInput<AlertParts>;
  children?: Node | string;
}
