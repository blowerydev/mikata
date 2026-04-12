import type { MikataColor, MikataBaseProps } from '../../types';

export interface HighlightProps extends MikataBaseProps {
  /** Text to display (highlighted portions replaced automatically) */
  children: string;
  /** Substring or substrings to highlight (case-insensitive) */
  highlight: string | string[];
  /** Mark color */
  color?: MikataColor;
}
