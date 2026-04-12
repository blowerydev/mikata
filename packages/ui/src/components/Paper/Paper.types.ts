import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type PaperParts = 'root';

export interface PaperProps extends MikataBaseProps {
  /** Drop shadow size */
  shadow?: MikataSize;
  /** Border radius size */
  radius?: MikataSize | 'full';
  /** Padding size */
  padding?: MikataSize | 'none';
  /** Render a border */
  withBorder?: boolean;
  classNames?: ClassNamesInput<PaperParts>;
  children?: Node | Node[];
}
