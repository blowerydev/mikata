import { createIcon, Close } from '../../internal/icons';
import { _mergeProps } from '@mikata/runtime';
import { mergeClasses } from '../../utils/class-merge';
import { useComponentDefaults } from '../../theme/component-defaults';
import { useUILabels } from '../../utils/use-i18n-optional';
import { ActionIcon } from '../ActionIcon';
import type { CloseButtonProps } from './CloseButton.types';
import './CloseButton.css';

export function CloseButton(userProps: CloseButtonProps = {}): HTMLButtonElement {
  const props = _mergeProps(
    useComponentDefaults<CloseButtonProps>('CloseButton') as unknown as Record<string, unknown>,
    userProps as unknown as Record<string, unknown>,
  ) as unknown as CloseButtonProps;

  const labels = useUILabels();
  const svg = createIcon(Close, { strokeWidth: 1.5 });

  return ActionIcon({
    variant: 'subtle',
    color: 'gray',
    get size() { return props.size ?? 'md'; },
    get disabled() { return props.disabled; },
    get onClick() { return props.onClick; },
    get ['aria-label']() { return props['aria-label'] ?? labels.close; },
    get class() { return mergeClasses('mkt-close-button', props.class); },
    ref: props.ref,
    children: svg,
  });
}
