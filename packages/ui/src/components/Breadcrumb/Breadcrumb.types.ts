import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type BreadcrumbParts = 'root' | 'item' | 'separator';

export interface BreadcrumbItem {
  label: string | Node;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps extends MikataBaseProps {
  items: BreadcrumbItem[];
  separator?: string;
  size?: MikataSize;
  classNames?: ClassNamesInput<BreadcrumbParts>;
}
