import type { MikataBaseProps, ClassNamesInput } from '../../types';

export type AspectRatioParts = 'root';

export interface AspectRatioProps extends MikataBaseProps {
  /** Width / height - e.g. 16 / 9 */
  ratio?: number;
  classNames?: ClassNamesInput<AspectRatioParts>;
  children?: Node;
}
