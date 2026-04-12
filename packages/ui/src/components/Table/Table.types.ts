import type { MikataSize, MikataBaseProps, ClassNamesInput } from '../../types';

export type TableParts = 'root' | 'table' | 'thead' | 'tbody' | 'tr' | 'th' | 'td';

export interface TableColumn<T = any> {
  key: string;
  title: string;
  render?: (row: T, index: number) => Node | string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T = any> extends MikataBaseProps {
  columns: TableColumn<T>[];
  data: T[];
  striped?: boolean;
  highlightOnHover?: boolean;
  withBorder?: boolean;
  withColumnBorders?: boolean;
  size?: MikataSize;
  classNames?: ClassNamesInput<TableParts>;
  onRowClick?: (row: T, index: number) => void;
}
