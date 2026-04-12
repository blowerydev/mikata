import type { MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type NotificationParts = 'root' | 'title' | 'description' | 'icon' | 'loader' | 'close';

export interface NotificationProps extends MikataBaseProps {
  /** Notification title */
  title?: string | Node;
  /** Accent color */
  color?: MikataColor;
  /** Icon shown on the left */
  icon?: Node;
  /** Show loader instead of icon */
  loading?: boolean;
  /** Hide the close button */
  withCloseButton?: boolean;
  /** Hide the accent border */
  withBorder?: boolean;
  /** Called when close button is clicked */
  onClose?: () => void;
  classNames?: ClassNamesInput<NotificationParts>;
  children?: Node | string;
}
