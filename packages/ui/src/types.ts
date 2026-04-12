import type { Ref } from '@mikata/runtime';

export type MikataSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type MikataColor =
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

export type ClassNamesInput<Parts extends string> = Partial<Record<Parts, string>>;

export interface MikataBaseProps {
  class?: string;
  ref?: Ref<HTMLElement> | ((el: HTMLElement) => void);
}

declare const __DEV__: boolean;
