import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type AccordionParts = 'root' | 'item' | 'control' | 'chevron' | 'panel' | 'label';
export type AccordionVariant = 'default' | 'contained' | 'separated';

export interface AccordionItem {
  value: string;
  label: string;
  content: Node | string | (() => Node);
  disabled?: boolean;
}

export interface AccordionProps extends MikataBaseProps {
  items: AccordionItem[];
  defaultValue?: string | string[];
  multiple?: boolean;
  variant?: AccordionVariant;
  size?: MikataSize;
  chevronPosition?: 'left' | 'right';
  classNames?: ClassNamesInput<AccordionParts>;
  onChange?: (value: string[]) => void;
}
