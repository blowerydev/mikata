import { createIcon, Close } from '@mikata/icons';
import { mergeClasses } from '../../utils/class-merge';
import { useUILabels } from '../../utils/use-i18n-optional';
import { ActionIcon } from '../ActionIcon';
import type { CloseButtonProps } from './CloseButton.types';
import './CloseButton.css';

export function CloseButton(props: CloseButtonProps = {}): HTMLButtonElement {
  const {
    size = 'md',
    disabled,
    onClick,
    class: className,
    ref,
  } = props;

  const labels = useUILabels();
  const ariaLabel = props['aria-label'] ?? labels.close;

  const svg = createIcon(Close, { strokeWidth: 1.5 });

  const el = ActionIcon({
    variant: 'subtle',
    color: 'gray',
    size,
    disabled,
    onClick,
    'aria-label': ariaLabel,
    class: mergeClasses('mkt-close-button', className),
    ref,
    children: svg,
  });

  return el;
}
