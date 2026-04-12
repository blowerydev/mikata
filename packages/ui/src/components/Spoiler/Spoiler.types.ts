import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type SpoilerParts = 'root' | 'content' | 'control';

export interface SpoilerProps extends MikataBaseProps {
  /** Max height shown when collapsed */
  maxHeight?: number;
  /** Label for expand control */
  showLabel?: string;
  /** Label for collapse control */
  hideLabel?: string;
  classNames?: ClassNamesInput<SpoilerParts>;
  children: Node;
}
