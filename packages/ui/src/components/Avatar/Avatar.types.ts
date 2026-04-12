import type { MikataSize, MikataColor, MikataBaseProps, ClassNamesInput } from '../../types';

export type AvatarParts = 'root' | 'image' | 'placeholder';
export type AvatarVariant = 'filled' | 'light' | 'outline';

export interface AvatarProps extends MikataBaseProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: MikataSize;
  color?: MikataColor;
  variant?: AvatarVariant;
  radius?: MikataSize | 'full';
  classNames?: ClassNamesInput<AvatarParts>;
}

export interface AvatarGroupProps extends MikataBaseProps {
  children: Node[];
  spacing?: MikataSize;
}
