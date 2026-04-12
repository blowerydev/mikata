import type { MikataBaseProps } from '../../types';

export interface FileButtonProps extends MikataBaseProps {
  /** The trigger button/element. Called with an onClick handler that opens the picker. */
  children: (open: () => void) => Node;
  /** Called with selected file(s) */
  onChange: (files: File | File[] | null) => void;
  /** accept attr: MIME types */
  accept?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Capture (camera etc.) */
  capture?: boolean | 'user' | 'environment';
  /** Disable input */
  disabled?: boolean;
  /** name attr for form submission */
  name?: string;
  /** form attr */
  form?: string;
  /** Reset value after selection so same file can trigger onChange again */
  resetRef?: { current: (() => void) | null };
}
