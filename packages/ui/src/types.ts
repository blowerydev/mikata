import type { Ref } from '@mikata/runtime';

export type MikataSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type BuiltInColor =
  | 'primary'
  | 'gray'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'cyan'
  | 'teal'
  | 'violet'
  | 'pink'
  | 'orange';

/**
 * Union of the 11 built-in palette names plus any custom palette name added
 * via `theme.colors`. The `(string & {})` opens the type without killing
 * autocomplete for built-ins.
 */
export type MikataColor = BuiltInColor | (string & {});

export type ClassNamesInput<Parts extends string> = Partial<Record<Parts, string>>;

export interface MikataBaseProps {
  class?: string;
  ref?: Ref<HTMLElement> | ((el: HTMLElement) => void);
}

declare const __DEV__: boolean;
