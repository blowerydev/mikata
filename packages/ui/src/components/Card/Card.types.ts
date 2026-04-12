import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type CardParts = 'root' | 'header' | 'body' | 'footer';

export interface CardProps extends MikataBaseProps {
  shadow?: MikataSize;
  padding?: MikataSize;
  radius?: MikataSize;
  withBorder?: boolean;
  classNames?: ClassNamesInput<CardParts>;
  children?: Node | string;
  header?: Node | string;
  footer?: Node | string;
}
