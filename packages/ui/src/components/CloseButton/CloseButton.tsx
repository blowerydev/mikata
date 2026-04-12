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

  // Create X icon SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 4 L12 12 M12 4 L4 12');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('fill', 'none');
  svg.appendChild(path);

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
