import type { MikataColor, MikataBaseProps } from '../../types';

export interface CodeProps extends MikataBaseProps {
  /** Render as a block-level <pre> instead of inline */
  block?: boolean;
  /** Background/text color palette */
  color?: MikataColor;
  children?: Node | string;
}
