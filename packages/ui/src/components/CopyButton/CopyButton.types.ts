import type { MikataBaseProps } from '../../types';

export interface CopyButtonRenderArgs {
  /** Call to copy `value` to clipboard. Flips `copied` true for `timeout` ms. */
  copy: () => void;
  /** True for `timeout` ms after a successful copy */
  copied: boolean;
}

export interface CopyButtonProps extends MikataBaseProps {
  /** String to copy when `copy()` is invoked */
  value: string;
  /** How long `copied` stays true after a copy, in ms (default 1000) */
  timeout?: number;
  /** Render-prop: receives `copy` and current `copied` state */
  children: (args: CopyButtonRenderArgs) => Node;
  /** Called after each successful copy */
  onCopy?: (value: string) => void;
}
