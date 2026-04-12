import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type TreeParts = 'root' | 'node' | 'nodeLabel' | 'nodeChildren' | 'expander';

export interface TreeNode {
  value: string;
  label: string | Node;
  children?: TreeNode[];
}

export interface TreeProps extends MikataBaseProps {
  data: TreeNode[];
  /** Initially expanded node values */
  defaultExpanded?: string[];
  /** Fire when a leaf is clicked */
  onSelect?: (value: string, node: TreeNode) => void;
  /** Currently selected node value (highlighted) */
  selected?: string;
  classNames?: ClassNamesInput<TreeParts>;
}
